// All talking to the Express backend happens here, so components never call fetch directly.
async function request(path, options = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || `Request failed (${res.status})`);
    error.status = res.status;
    throw error;
  }
  return res.status === 204 ? null : res.json();
}

const send = (method, body) => ({ method, body: JSON.stringify(body) });

export const api = {
  getCurrentUser: () => request('/auth/me'),
  signUp: (email, password) => request('/auth/signup', send('POST', { email, password })),
  logIn: (email, password) => request('/auth/login', send('POST', { email, password })),
  logOut: () => request('/auth/logout', { method: 'POST' }),
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
const cacheKey = (userId) => `fintrack:cache:${userId}`;

export function saveCache(userId, data) {
  try {
    localStorage.setItem(cacheKey(userId), JSON.stringify(data));
  } catch {
    /* storage full or blocked - not a big deal */
  }
}

export function loadCache(userId) {
  try {
    return JSON.parse(localStorage.getItem(cacheKey(userId))) || null;
  } catch {
    return null;
  }
}

export function clearCache(userId) {
  try {
    localStorage.removeItem(cacheKey(userId));
  } catch {
    /* storage access may be blocked */
  }
}
