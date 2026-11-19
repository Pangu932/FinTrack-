import { useEffect, useState, useCallback } from 'react';
import { api, saveCache, loadCache } from './api.js';
import { currentMonth } from './utils.js';
import Dashboard from './components/Dashboard.jsx';
import Transactions from './components/Transactions.jsx';
import Budgets from './components/Budgets.jsx';
import Analytics from './components/Analytics.jsx';

const TABS = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'analytics', label: 'Analytics' },
];

export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [month, setMonth] = useState(currentMonth());
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [toast, setToast] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [t, b] = await Promise.all([api.getTransactions(), api.getBudgets()]);
      setTransactions(t);
      setBudgets(b);
      saveCache({ transactions: t, budgets: b });
      setOffline(false);
    } catch {
      // server is down - fall back to whatever we saved last time
      const cached = loadCache();
      if (cached) {
        setTransactions(cached.transactions);
        setBudgets(cached.budgets);
      }
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // little message at the bottom of the screen, disappears on its own
  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const shared = { transactions, budgets, month, setMonth, refresh, notify, offline };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <span className="brand-name">FinTrack</span>
        </div>
        <nav>
          {TABS.map((t) => (
            <button key={t.id} className={'nav-item' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <p className="sidebar-note">Your data is saved in a local SQLite database.</p>
      </aside>

      <main className="content">
        {offline && (
          <div className="banner">
            Can't reach the server, so you're looking at the last saved copy. Start it with <code>npm run dev</code> to make changes.
          </div>
        )}
        {loading ? (
          <p className="muted">Loading your records…</p>
        ) : (
          <>
            {tab === 'dashboard' && <Dashboard {...shared} goTo={setTab} />}
            {tab === 'transactions' && <Transactions {...shared} />}
            {tab === 'budgets' && <Budgets {...shared} />}
            {tab === 'analytics' && <Analytics {...shared} />}
          </>
        )}
      </main>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
