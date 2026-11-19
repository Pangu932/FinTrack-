import MonthPicker from './MonthPicker.jsx';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import { money, monthLabel, monthlyTotals, spendByCategory, dailySpending, CATEGORY_COLORS } from '../utils.js';

const axis = { fontSize: 12, fill: '#5d6b6a' };
const compact = (v) => (v >= 1000 ? `${v / 1000}k` : v);
const tooltipStyle = { borderRadius: 8, border: '1px solid #d5dedb', fontFamily: 'inherit', fontSize: 13 };

export default function Analytics({ transactions, month, setMonth }) {
  const monthly = monthlyTotals(transactions, month, 6);
  const inMonth = transactions.filter((t) => t.date.startsWith(month));
  const cats = Object.entries(spendByCategory(inMonth))
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  const totalSpent = cats.reduce((a, c) => a + c.value, 0);
  const trend = dailySpending(transactions, month);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Analytics</h1>
          <p className="muted">Six months ending {monthLabel(month, true)}.</p>
        </div>
        <MonthPicker month={month} setMonth={setMonth} />
      </header>

      <section className="panel">
        <h2>Income vs. expenses</h2>
        <div className="chart tall">
          <ResponsiveContainer>
            <BarChart data={monthly} barGap={4}>
              <CartesianGrid vertical={false} stroke="#e1e8e5" />
              <XAxis dataKey="month" tick={axis} tickLine={false} axisLine={false} />
              <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} width={40} />
              <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} cursor={{ fill: 'rgba(23,48,47,0.05)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
              <Bar dataKey="Income" fill="#3a8a68" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expenses" fill="#d0554a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>Where the money went</h2>
          {cats.length === 0 ? (
            <p className="empty">No expenses in {monthLabel(month, true)}.</p>
          ) : (
            <div className="pie-wrap">
              <div className="chart pie">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={cats} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="92%" paddingAngle={2} stroke="none">
                      {cats.map((c) => <Cell key={c.name} fill={CATEGORY_COLORS[c.name] || '#8c9496'} />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="legend">
                {cats.map((c) => (
                  <li key={c.name}>
                    <i className="swatch" style={{ background: CATEGORY_COLORS[c.name] || '#8c9496' }} />
                    <span>{c.name}</span>
                    <span className="muted">{Math.round((c.value / totalSpent) * 100)}%</span>
                    <strong>{money(c.value)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="panel">
          <h2>Spending through the month</h2>
          <p className="muted small-text">Running total of expenses, day by day.</p>
          <div className="chart">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d0554a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#d0554a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e1e8e5" />
                <XAxis dataKey="day" tick={axis} tickLine={false} axisLine={false} interval={4} />
                <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={compact} width={40} />
                <Tooltip formatter={(v) => money(v)} labelFormatter={(d) => `Day ${d}`} contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="Total" stroke="#d0554a" strokeWidth={2} fill="url(#spendFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </>
  );
}
