// Opens (or creates) the SQLite file and makes sure the tables exist.
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(process.env.DATABASE_PATH || path.join(__dirname, 'fintrack.db'));
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL COLLATE NOCASE UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type      TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
    amount    REAL    NOT NULL CHECK (amount > 0),
    category  TEXT    NOT NULL,
    note      TEXT    DEFAULT '',
    date      TEXT    NOT NULL,              -- stored as YYYY-MM-DD
    created_at TEXT   DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id   INTEGER REFERENCES users(id) ON DELETE CASCADE,
    category  TEXT NOT NULL,
    month     TEXT NOT NULL,                 -- YYYY-MM
    amount    REAL NOT NULL CHECK (amount > 0),
    UNIQUE (user_id, category, month)
  );

  CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions (date);
`);

function hasColumn(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((row) => row.name === column);
}

if (!hasColumn('transactions', 'user_id')) {
  db.exec('ALTER TABLE transactions ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
}

if (!hasColumn('budgets', 'user_id')) {
  db.exec(`
    ALTER TABLE budgets RENAME TO budgets_legacy;
    CREATE TABLE budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      month TEXT NOT NULL,
      amount REAL NOT NULL CHECK (amount > 0),
      UNIQUE (user_id, category, month)
    );
    INSERT INTO budgets (id, category, month, amount)
      SELECT id, category, month, amount FROM budgets_legacy;
    DROP TABLE budgets_legacy;
  `);
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions (user_id, date, id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions (user_id);
`);

module.exports = db;
