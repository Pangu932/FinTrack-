import { useEffect, useState, useCallback } from 'react';
import { api, saveCache, loadCache, clearCache } from './api.js';
import { currentMonth } from './utils.js';
import Dashboard from './components/Dashboard.jsx';
import Transactions from './components/Transactions.jsx';
import Budgets from './components/Budgets.jsx';
import Analytics from './components/Analytics.jsx';
import Landing from './components/Landing.jsx';
import AuthPage from './components/AuthPage.jsx';

const TABS = [
  { id: 'dashboard', label: 'Overview' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'analytics', label: 'Analytics' },
];

function FinanceApp({ user }) {
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
      saveCache(user.id, { transactions: t, budgets: b });
      setOffline(false);
    } catch (error) {
      if (error.status === 401) {
        window.location.replace('/login');
        return;
      }
      const cached = loadCache(user.id);
      if (cached) {
        setTransactions(cached.transactions);
        setBudgets(cached.budgets);
      }
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  async function logOut() {
    try {
      await api.logOut();
      clearCache(user.id);
      window.location.assign('/');
    } catch {
      notify('Could not sign out. Check your connection and try again.');
    }
  }

  const shared = { transactions, budgets, month, setMonth, refresh, notify, offline };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">F</span>
          <span className="brand-name">FinTrack</span>
        </div>
        <nav aria-label="Main navigation">
          {TABS.map((t) => (
            <button key={t.id} className={'nav-item' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-account">
          <span className="account-email">{user.email}</span>
          <button className="nav-item signout" onClick={logOut}>Sign out</button>
          <p className="sidebar-note">Demo account — records may be reset at any time.</p>
        </div>
      </aside>

      <main className="content">
        {offline && (
          <div className="banner">
            Can’t reach the server, so you’re looking at the last saved copy. Start it with <code>npm run dev</code> to make changes.
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

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}

function ProtectedApp() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    api.getCurrentUser()
      .then((currentUser) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) window.location.replace('/login');
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => { active = false; };
  }, []);

  if (checking || !user) return <main className="auth-page"><p className="muted">Checking your account…</p></main>;
  return <FinanceApp user={user} />;
}

export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/login') return <AuthPage mode="login" />;
  if (path === '/signup') return <AuthPage mode="signup" />;
  if (path === '/app') return <ProtectedApp />;
  return <Landing />;
}
