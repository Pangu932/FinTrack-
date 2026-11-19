// All talking to the Express backend happens here, so components never call fetch directly.
async function request(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.status === 204 ? null : res.json();
}

const send = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  getTransactions: () => request('/transactions'),
  addTransaction: (t) => request('/transactions', send('POST', t)),
  updateTransaction: (id, t) => request(`/transactions/${id}`, send('PUT', t)),
  deleteTransaction: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
  importTransactions: (rows) => request('/transactions/bulk', send('POST', { rows })),
  getBudgets: () => request('/budgets'),
  setBudget: (category, month, amount) => request('/budgets', send('PUT', { category, month, amount })),
};

// LocalStorage keeps a copy of the last data we received, so the app still
// shows something if the server is switched off.
const CACHE_KEY = 'fintrack:cache';

export function saveCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked - not a big deal */
  }
}

export function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY)) || null;
  } catch {
    return null;
  }
}
