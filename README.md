# FinTrack – Personal Finance Management System

A full-stack personal finance tracker built as an engineering minor project.
You can record income and expenses, set monthly category budgets, search and filter your history,
import/export CSV files and see where your money goes through charts.

| Layer      | Technology                                   |
|------------|----------------------------------------------|
| Frontend   | React 18 (Vite), JavaScript, HTML5, CSS3     |
| Charts     | Recharts                                     |
| Backend    | Node.js + Express (REST API)                 |
| Database   | SQLite (via `better-sqlite3`)                |
| Browser    | LocalStorage – offline copy of last-loaded data |

## Features

1. **Overview** – all-time balance, this month's income / expenses / savings rate, latest transactions, budget watch.
2. **Transactions** – add, edit, delete; separate categories for income and expenses.
3. **Budgets** – monthly limit per expense category with progress bars (turns amber at 80%, red when exceeded).
4. **Analytics** – income vs. expenses for six months, category breakdown (donut), running spend through the month.
5. **Filters** – search text, type, category, date range.
6. **CSV import / export** – validated import (inserted in one DB transaction), export respects current filters.
7. **Accounts** – email/password sign-up and login, hashed passwords, and account-scoped transactions and budgets.
8. **Persistence** – everything lives in `server/fintrack.db`; LocalStorage keeps an account-scoped cached copy so the UI still opens (read-only) if the server is off.
9. **Responsive** – sidebar on desktop, bottom tab bar on phones, single-column layouts on tablet/mobile.

## Getting started

You need **Node.js 18 or newer** (https://nodejs.org).

```bash
cd FinTrack
npm run install:all      # installs root, server and client dependencies
npm run seed             # optional: adds four months of demo data
npm run dev              # starts API on :3001 and the React app on :5173
```

Open **http://localhost:5173**.

### Production style (one server)

```bash
npm run build            # builds the React app into client/dist
npm start                # Express serves the API and the built app on http://localhost:3001
```

### Render demo deployment

The `render.yaml` blueprint deploys the app as a free Render web service. It is intended for demos only:
the free service uses an ephemeral filesystem, so accounts and SQLite data may be lost when the service
restarts or redeploys. Signup uses email and password without email verification or password recovery.
Do not store real or sensitive financial information. Persistent SQLite storage requires paid Render resources.

> If `better-sqlite3` fails to install on your machine, make sure you're on a current Node LTS release;
> it ships prebuilt binaries for those. On older versions it needs Python and a C++ build toolchain.

## Project structure

```
FinTrack/
├── package.json            root scripts (install:all, dev, seed, build, start)
├── server/
│   ├── index.js            Express app, validation, REST routes
│   ├── db.js               SQLite connection + table creation
│   └── seed.js             demo data
└── client/
    ├── index.html
    ├── vite.config.js      dev proxy: /api -> localhost:3001
    └── src/
        ├── main.jsx, App.jsx
        ├── api.js          fetch wrapper + LocalStorage cache
        ├── utils.js        money format, month maths, totals, chart data
        ├── csv.js          CSV export and a quote-aware parser
        ├── styles.css
        └── components/
            Dashboard, Transactions, TransactionForm,
            Budgets, Analytics, MonthPicker
```

## Database schema

```sql
transactions(id PK, type CHECK in ('income','expense'), amount REAL > 0,
             category, note, date 'YYYY-MM-DD', created_at)

budgets(id PK, category, month 'YYYY-MM', amount REAL > 0,  UNIQUE(category, month))
```

## REST API

| Method | Endpoint                  | Purpose                                   |
|--------|---------------------------|-------------------------------------------|
| POST   | `/api/auth/signup`        | create an account and sign in              |
| POST   | `/api/auth/login`         | sign in                                    |
| POST   | `/api/auth/logout`        | end the current session                    |
| GET    | `/api/auth/me`            | get the current account                    |
| GET    | `/api/transactions`       | list all, newest first                    |
| POST   | `/api/transactions`       | create one                                |
| POST   | `/api/transactions/bulk`  | CSV import `{ rows: [...] }` (atomic)     |
| PUT    | `/api/transactions/:id`   | update                                    |
| DELETE | `/api/transactions/:id`   | delete                                    |
| GET    | `/api/budgets`            | list all budgets                          |
| PUT    | `/api/budgets`            | upsert `{category, month, amount}`; `0` removes it |

All input is validated on the server (type, positive amount, date format, category) and errors come back as `{ "error": "message" }`.

## CSV format

```csv
date,type,amount,category,note
2026-03-01,income,42000,Salary,Monthly pay
2026-03-02,expense,12000,Rent,Room rent
```

Dates must be `YYYY-MM-DD`; `type` is `income` or `expense`. Notes with commas should be in double quotes.

## Presentation notes

- **Architecture:** React SPA → REST (JSON) → Express → SQLite. Vite proxies `/api` during development.
- **Why SQLite:** file-based relational DB, zero setup, enforces constraints (`CHECK`, `UNIQUE`) and supports transactions.
- **Interesting parts to explain:** atomic bulk import, budget upsert with `ON CONFLICT`, derived analytics in `utils.js`, offline cache fallback.

## Possible extensions

User login with JWT, recurring transactions, multiple currencies, receipts upload, PDF reports, unit tests with Vitest/Jest.
