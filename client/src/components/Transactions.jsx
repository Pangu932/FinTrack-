import { useMemo, useRef, useState } from 'react';
import TransactionForm from './TransactionForm.jsx';
import { api } from '../api.js';
import { exportCSV, parseCSV } from '../csv.js';
import { money, prettyDate, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../utils.js';

const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];
const EMPTY_FILTERS = { q: '', type: 'all', category: 'all', from: '', to: '' };

export default function Transactions({ transactions, refresh, notify, offline }) {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...tx} = edit
  const fileRef = useRef(null);

  const setFilter = (field) => (e) => setFilters({ ...filters, [field]: e.target.value });

  const visible = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filters.type !== 'all' && t.type !== filters.type) return false;
      if (filters.category !== 'all' && t.category !== filters.category) return false;
      if (filters.from && t.date < filters.from) return false;
      if (filters.to && t.date > filters.to) return false;
      if (q && !(`${t.note} ${t.category}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [transactions, filters]);

  const filtersActive = JSON.stringify(filters) !== JSON.stringify(EMPTY_FILTERS);

  const save = async (data) => {
    if (editing.id) {
      await api.updateTransaction(editing.id, data);
      notify('Transaction updated');
    } else {
      await api.addTransaction(data);
      notify('Transaction added');
    }
    setEditing(null);
    refresh();
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete ${t.category} (${money(t.amount)}) from ${prettyDate(t.date)}?`)) return;
    try {
      await api.deleteTransaction(t.id);
      notify('Transaction deleted');
      refresh();
    } catch (err) {
      notify(err.message);
    }
  };

  const importFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const { rows, errors } = parseCSV(await file.text());
    if (errors.length) {
      const shown = errors.slice(0, 4).join('\n');
      window.alert(`Couldn't import this file. Fix these and try again:\n\n${shown}${errors.length > 4 ? `\n…and ${errors.length - 4} more` : ''}`);
      return;
    }
    try {
      const res = await api.importTransactions(rows);
      notify(`Imported ${res.imported} transactions`);
      refresh();
    } catch (err) {
      notify(err.message);
    }
  };

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Transactions</h1>
          <p className="muted">{transactions.length} records in total</p>
        </div>
        <div className="head-actions">
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={importFile} />
          <button className="btn ghost" disabled={offline} onClick={() => fileRef.current.click()}>Import CSV</button>
          <button className="btn ghost" disabled={!transactions.length} onClick={() => exportCSV(visible)}>Export CSV</button>
          <button className="btn primary" disabled={offline} onClick={() => setEditing({})}>Add transaction</button>
        </div>
      </header>

      <div className="filters">
        <input type="search" placeholder="Search notes or categories" value={filters.q} onChange={setFilter('q')} />
        <select value={filters.type} onChange={setFilter('type')} aria-label="Type">
          <option value="all">Income and expenses</option>
          <option value="income">Income only</option>
          <option value="expense">Expenses only</option>
        </select>
        <select value={filters.category} onChange={setFilter('category')} aria-label="Category">
          <option value="all">All categories</option>
          {ALL_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="date-filter">From <input type="date" value={filters.from} onChange={setFilter('from')} /></label>
        <label className="date-filter">To <input type="date" value={filters.to} onChange={setFilter('to')} /></label>
        {filtersActive && <button className="link" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</button>}
      </div>

      <section className="panel flush">
        {visible.length === 0 ? (
          <p className="empty pad">
            {transactions.length === 0
              ? 'No transactions yet. Add one, or import a CSV with the columns date, type, amount, category, note.'
              : 'No transactions match these filters.'}
          </p>
        ) : (
          <ul className="tx-list">
            {visible.map((t) => (
              <li key={t.id}>
                <span className="tx-date">{prettyDate(t.date)}</span>
                <span className="tx-main">
                  <strong>{t.category}</strong>
                  {t.note && <small>{t.note}</small>}
                </span>
                <span className={'tx-amt ' + (t.type === 'income' ? 'in' : 'out')}>
                  {t.type === 'income' ? '+' : '−'}{money(t.amount)}
                </span>
                <span className="tx-actions">
                  <button className="link" disabled={offline} onClick={() => setEditing(t)}>Edit</button>
                  <button className="link danger" disabled={offline} onClick={() => remove(t)}>Delete</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && (
        <TransactionForm
          initial={editing.id ? { ...editing, amount: String(editing.amount) } : null}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
