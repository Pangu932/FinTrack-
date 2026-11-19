import { todayISO } from './utils.js';

const HEADER = ['date', 'type', 'amount', 'category', 'note'];

const escapeCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportCSV(transactions) {
  const lines = [HEADER.join(',')];
  for (const t of transactions) lines.push(HEADER.map((h) => escapeCell(t[h])).join(','));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fintrack-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Small CSV reader that understands quoted cells ("Dal, rice") and escaped quotes ("")
function parseRows(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

// Returns { rows, errors }. The first line must be a header containing at least date,type,amount,category.
export function parseCSV(text) {
  const table = parseRows(text.replace(/^\uFEFF/, ''));
  if (table.length < 2) return { rows: [], errors: ['The file has no data rows.'] };

  const head = table[0].map((h) => h.trim().toLowerCase());
  const missing = ['date', 'type', 'amount', 'category'].filter((h) => !head.includes(h));
  if (missing.length) return { rows: [], errors: [`Missing column(s): ${missing.join(', ')}`] };

  const rows = [];
  const errors = [];
  table.slice(1).forEach((cells, i) => {
    const r = {};
    head.forEach((h, idx) => (r[h] = (cells[idx] || '').trim()));
    const line = i + 2;
    r.type = r.type.toLowerCase();
    r.amount = Number(r.amount);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date)) errors.push(`Line ${line}: date should be YYYY-MM-DD`);
    else if (r.type !== 'income' && r.type !== 'expense') errors.push(`Line ${line}: type should be income or expense`);
    else if (!(r.amount > 0)) errors.push(`Line ${line}: amount should be a positive number`);
    else if (!r.category) errors.push(`Line ${line}: category is empty`);
    else rows.push({ date: r.date, type: r.type, amount: r.amount, category: r.category, note: r.note || '' });
  });
  return { rows, errors };
}
