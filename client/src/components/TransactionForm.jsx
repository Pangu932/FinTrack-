import { useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, todayISO } from '../utils.js';

export default function TransactionForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(
    initial || { type: 'expense', amount: '', category: 'Food', date: todayISO(), note: '' }
  );
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const switchType = (type) => {
    const list = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setForm({ ...form, type, category: list.includes(form.category) ? form.category : list[0] });
  };

  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!(amount > 0)) return setError('Enter an amount greater than zero.');
    if (!form.date) return setError('Pick a date.');
    setBusy(true);
    try {
      await onSave({ ...form, amount });
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h2>{initial ? 'Edit transaction' : 'New transaction'}</h2>

        <div className="seg">
          <button type="button" className={form.type === 'expense' ? 'on out' : ''} onClick={() => switchType('expense')}>Expense</button>
          <button type="button" className={form.type === 'income' ? 'on in' : ''} onClick={() => switchType('income')}>Income</button>
        </div>

        <label>
          Amount (Rs.)
          <input type="number" min="0" step="any" inputMode="decimal" value={form.amount} onChange={set('amount')} autoFocus placeholder="0" />
        </label>

        <div className="row2">
          <label>
            Category
            <select value={form.category} onChange={set('category')}>
              {categories.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={form.date} max={todayISO()} onChange={set('date')} />
          </label>
        </div>

        <label>
          Note <span className="muted">(optional)</span>
          <input type="text" maxLength={200} value={form.note} onChange={set('note')} placeholder="e.g. lunch at campus canteen" />
        </label>

        {error && <p className="form-error">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary" disabled={busy}>{initial ? 'Save changes' : 'Add transaction'}</button>
        </div>
      </form>
    </div>
  );
}
