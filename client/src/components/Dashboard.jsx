import MonthPicker from './MonthPicker.jsx';
import { money, prettyDate, summarize, spendByCategory, monthLabel, CATEGORY_COLORS } from '../utils.js';

export default function Dashboard({ transactions, budgets, month, setMonth, goTo }) {
  const everything = summarize(transactions);
  const inMonth = transactions.filter((t) => t.date.startsWith(month));
  const m = summarize(inMonth);
  const saved = m.income - m.expense;
  const rate = m.income > 0 ? Math.round((saved / m.income) * 100) : null;
  const flow = m.income + m.expense;
  const incomeShare = flow ? (m.income / flow) * 100 : 50;

  // budgets for this month, sorted so the ones closest to the limit come first
  const spent = spendByCategory(inMonth);
  const watch = budgets
    .filter((b) => b.month === month)
    .map((b) => ({ ...b, used: spent[b.category] || 0, pct: ((spent[b.category] || 0) / b.amount) * 100 }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);

  const recent = inMonth.slice(0, 6);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="muted">How {monthLabel(month, true)} is going.</p>
        </div>
        <MonthPicker month={month} setMonth={setMonth} />
      </header>

      <section className="hero">
        <p className="hero-label">Total balance, all time</p>
        <p className={'hero-number' + (everything.balance < 0 ? ' neg' : '')}>{money(everything.balance)}</p>

        <div className="flow">
          <div className="flow-bar" role="img" aria-label="Income compared to expenses this month">
            <span className="flow-in" style={{ width: incomeShare + '%' }} />
            <span className="flow-out" style={{ width: 100 - incomeShare + '%' }} />
          </div>
          <dl className="flow-legend">
            <div><dt><i className="dot in" />Money in</dt><dd>{money(m.income)}</dd></div>
            <div><dt><i className="dot out" />Money out</dt><dd>{money(m.expense)}</dd></div>
            <div>
              <dt>Saved this month</dt>
              <dd className={saved < 0 ? 'neg' : ''}>
                {money(saved)}
                {rate !== null && <small> ({rate}%)</small>}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel-head">
            <h2>Latest transactions</h2>
            <button className="link" onClick={() => goTo('transactions')}>See all</button>
          </div>
          {recent.length === 0 ? (
            <p className="empty">Nothing recorded for this month yet. Add your first transaction from the Transactions page.</p>
          ) : (
            <ul className="mini-list">
              {recent.map((t) => (
                <li key={t.id}>
                  <span className="mini-date">{prettyDate(t.date)}</span>
                  <span className="mini-main">
                    {t.category}
                    {t.note && <small>{t.note}</small>}
                  </span>
                  <span className={t.type === 'income' ? 'amt in' : 'amt out'}>
                    {t.type === 'income' ? '+' : '−'}{money(t.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Budget watch</h2>
            <button className="link" onClick={() => goTo('budgets')}>Edit budgets</button>
          </div>
          {watch.length === 0 ? (
            <p className="empty">No budgets set for {monthLabel(month, true)}. Set a limit for a category to track it here.</p>
          ) : (
            <ul className="watch-list">
              {watch.map((b) => (
                <li key={b.category}>
                  <div className="watch-row">
                    <span>{b.category}</span>
                    <span className={b.pct > 100 ? 'neg' : 'muted'}>{money(b.used)} of {money(b.amount)}</span>
                  </div>
                  <div className="track">
                    <span
                      className={'fill' + (b.pct > 100 ? ' over' : b.pct > 80 ? ' warn' : '')}
                      style={{ width: Math.min(b.pct, 100) + '%', background: b.pct > 80 ? undefined : CATEGORY_COLORS[b.category] }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
