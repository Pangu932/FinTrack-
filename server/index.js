const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./db');
const createAuth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb' }));
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

const auth = createAuth(db);
app.use('/api/auth', auth.router);
app.use('/api', auth.requireAuth);

// ---------- helpers ----------
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

// Returns a cleaned transaction object, or throws an Error with a readable message
function cleanTransaction(body) {
  const type = String(body.type || '').toLowerCase();
  const amount = Number(body.amount);
  const category = String(body.category || '').trim();
  const date = String(body.date || '').trim();
  const note = String(body.note || '').trim().slice(0, 200);

  if (type !== 'income' && type !== 'expense') throw new Error('Type must be income or expense');
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Amount must be a number greater than 0');
  if (!category) throw new Error('Category is required');
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(date))) throw new Error('Date must look like 2026-03-27');

  return { type, amount, category, date, note };
}

const wrap = (fn) => (req, res) => {
  try {
    fn(req, res);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// ---------- transactions ----------
app.get('/api/transactions', (req, res) => {
  const rows = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, id DESC').all(req.user.id);
  res.json(rows);
});

app.post('/api/transactions', wrap((req, res) => {
  const t = cleanTransaction(req.body);
  const info = db
    .prepare('INSERT INTO transactions (user_id, type, amount, category, note, date) VALUES (@userId, @type, @amount, @category, @note, @date)')
    .run({ ...t, userId: req.user.id });
  res.status(201).json(db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(info.lastInsertRowid, req.user.id));
}));

// Used by CSV import: all rows are inserted together or not at all
app.post('/api/transactions/bulk', wrap((req, res) => {
  if (!Array.isArray(req.body.rows)) throw new Error('rows must be an array');
  const cleaned = req.body.rows.map((r, i) => {
    try {
      return cleanTransaction(r);
    } catch (e) {
      throw new Error(`Row ${i + 1}: ${e.message}`);
    }
  });
  const insert = db.prepare('INSERT INTO transactions (user_id, type, amount, category, note, date) VALUES (@userId, @type, @amount, @category, @note, @date)');
  db.transaction((rows) => rows.forEach((r) => insert.run({ ...r, userId: req.user.id })))(cleaned);
  res.status(201).json({ imported: cleaned.length });
}));

app.put('/api/transactions/:id', wrap((req, res) => {
  const t = cleanTransaction(req.body);
  const info = db
    .prepare('UPDATE transactions SET type=@type, amount=@amount, category=@category, note=@note, date=@date WHERE id=@id AND user_id=@userId')
    .run({ ...t, id: req.params.id, userId: req.user.id });
  if (!info.changes) return res.status(404).json({ error: 'Transaction not found' });
  res.json(db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id));
}));

app.delete('/api/transactions/:id', (req, res) => {
  const info = db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Transaction not found' });
  res.status(204).end();
});

// ---------- budgets ----------
app.get('/api/budgets', (req, res) => {
  res.json(db.prepare('SELECT category, month, amount FROM budgets WHERE user_id = ?').all(req.user.id));
});

// Upsert: sending amount 0 clears the budget for that category/month
app.put('/api/budgets', wrap((req, res) => {
  const category = String(req.body.category || '').trim();
  const month = String(req.body.month || '');
  const amount = Number(req.body.amount);
  if (!category) throw new Error('Category is required');
  if (!MONTH_RE.test(month)) throw new Error('Month must look like 2026-03');
  if (!Number.isFinite(amount) || amount < 0) throw new Error('Budget cannot be negative');

  if (amount === 0) {
    db.prepare('DELETE FROM budgets WHERE category = ? AND month = ? AND user_id = ?').run(category, month, req.user.id);
  } else {
    db.prepare(`INSERT INTO budgets (user_id, category, month, amount) VALUES (?, ?, ?, ?)
                ON CONFLICT (user_id, category, month) DO UPDATE SET amount = excluded.amount`)
      .run(req.user.id, category, month, amount);
  }
  res.json({ category, month, amount });
}));

// ---------- serve built frontend (after `npm run build`) ----------
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.listen(PORT, () => console.log(`FinTrack API running on http://localhost:${PORT}`));
