// Opens (or creates) the SQLite file and makes sure the tables exist.
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(process.env.DATABASE_PATH || path.join(__dirname, 'fintrack.db'));
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    type      TEXT    NOT NULL CHECK (type IN ('income', 'expense')),
    amount    REAL    NOT NULL CHECK (amount > 0),
    category  TEXT    NOT NULL,
    note      TEXT    DEFAULT '',
    date      TEXT    NOT NULL,              -- stored as YYYY-MM-DD
    created_at TEXT   DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    category  TEXT NOT NULL,
    month     TEXT NOT NULL,                 -- YYYY-MM
    amount    REAL NOT NULL CHECK (amount > 0),
    UNIQUE (category, month)
  );

  CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions (date);
`);

module.exports = db;
