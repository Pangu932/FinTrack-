import { useState } from 'react';
import MonthPicker from './MonthPicker.jsx';
import { api } from '../api.js';
import { money, monthLabel, spendByCategory, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '../utils.js';

function BudgetRow({ category, budget, spent, month, onSaved, notify, offline }) {
  const [value, setValue] = useState(budget ? String(budget) : '');
  const pct = budget ? (spent / budget) * 100 : 0;
  const changed = Number(value || 0) !== (budget || 0);

  const save = async () => {
    const n = Number(value || 0);
    if (n < 0 || Number.isNaN(n)) return notify('Budget must be zero or more');
    try {
      await api.setBudget(category, month, n);
      notify(n === 0 ? `${category} budget removed` : `${category} budget saved`);
      onSaved();
    } catch (err) {
      notify(err.message);
    }
  };

  let status = 'No budget set';
  if (budget) {
    status = spent > budget ? `Over by ${money(spent - budget)}` : `${money(budget - spent)} left`;
  }

  return (
    <li className="budget-row">
      <div className="budget-top">
        <span className="swatch" style={{ background: CATEGORY_COLORS[category] }} />
        <strong>{category}</strong>
        <span className={'budget-status' + (budget && spent > budget ? ' neg' : '')}>{status}</span>
      </div>
      <div className="track">
        <span
          className={'fill' + (pct > 100 ? ' over' : pct > 80 ? ' warn' : '')}
          style={{ width: Math.min(pct, 100) + '%', background: pct > 80 ? undefined : CATEGORY_COLORS[category] }}
        />
      </div>
      <div className="budget-bottom">
        <span className="muted">Spent {money(spent)}</span>
        <span className="budget-edit">
          <input
            type="number"
            min="0"
            inputMode="decimal"
            placeholder="Limit"
            aria-label={`${category} monthly limit`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={offline}
          />
          <button className="btn small" disabled={!changed || offline} onClick={save}>Save</button>
        </span>
      </div>
    </li>
  );
}

export default function Budgets({ transactions, budgets, month, setMonth, refresh, notify, offline }) {
  const spent = spendByCategory(transactions.filter((t) => t.date.startsWith(month)));
  const forMonth = Object.fromEntries(budgets.filter((b) => b.month === month).map((b) => [b.category, b.amount]));

  const totalBudget = Object.values(forMonth).reduce((a, b) => a + b, 0);
  const totalSpentOnBudgeted = Object.keys(forMonth).reduce((a, c) => a + (spent[c] || 0), 0);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Budgets</h1>
          <p className="muted">
            {totalBudget
              ? `${money(totalSpentOnBudgeted)} spent of ${money(totalBudget)} planned for ${monthLabel(month, true)}`
              : `Set a monthly limit for the categories you want to keep an eye on.`}
          </p>
        </div>
        <MonthPicker month={month} setMonth={setMonth} />
      </header>

      <section className="panel">
        <ul className="budget-list">
          {EXPENSE_CATEGORIES.map((c) => (
            // key includes the month so the input resets when you change month
            <BudgetRow
              key={c + month + (forMonth[c] || 0)}
              category={c}
              budget={forMonth[c]}
              spent={spent[c] || 0}
              month={month}
              onSaved={refresh}
              notify={notify}
              offline={offline}
            />
          ))}
        </ul>
      </section>
    </>
  );
}
