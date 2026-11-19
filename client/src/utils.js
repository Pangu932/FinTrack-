export const EXPENSE_CATEGORIES = ['Food', 'Rent', 'Transport', 'Shopping', 'Bills', 'Health', 'Education', 'Entertainment', 'Other'];
export const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];

// One colour per expense category, reused in the pie chart and the budget bars
export const CATEGORY_COLORS = {
  Food: '#e8913a',
  Rent: '#2f5d62',
  Transport: '#5b8fb9',
  Shopping: '#c2557a',
  Bills: '#8a7ca8',
  Health: '#4f9d78',
  Education: '#d3b13c',
  Entertainment: '#d6584c',
  Other: '#8c9496',
};

const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'NPR', maximumFractionDigits: 0 });
export const money = (n) => formatter.format(n || 0).replace('NPR', 'Rs.').replace(/\s/, ' ');

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const currentMonth = () => todayISO().slice(0, 7);

export function monthLabel(key, long = false) {
  const d = new Date(key + '-01T00:00:00');
  return d.toLocaleString('en', { month: long ? 'long' : 'short', year: 'numeric' });
}

export function shiftMonth(key, by) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function prettyDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

export function summarize(list) {
  let income = 0;
  let expense = 0;
  for (const t of list) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, balance: income - expense };
}

export function spendByCategory(list) {
  const totals = {};
  for (const t of list) {
    if (t.type === 'expense') totals[t.category] = (totals[t.category] || 0) + t.amount;
  }
  return totals;
}

// Last `count` months ending at `endMonth`, with income/expense totals for each
export function monthlyTotals(list, endMonth, count = 6) {
  const rows = [];
  for (let i = count - 1; i >= 0; i--) {
    const key = shiftMonth(endMonth, -i);
    const s = summarize(list.filter((t) => t.date.startsWith(key)));
    rows.push({ month: monthLabel(key).split(' ')[0], key, Income: s.income, Expenses: s.expense });
  }
  return rows;
}

// Daily spending for one month, plus a running total (used by the trend chart)
export function dailySpending(list, month) {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(y, m, 0).getDate();
  const perDay = Array(days).fill(0);
  for (const t of list) {
    if (t.type === 'expense' && t.date.startsWith(month)) perDay[Number(t.date.slice(8, 10)) - 1] += t.amount;
  }
  let running = 0;
  return perDay.map((v, i) => {
    running += v;
    return { day: i + 1, Spent: v, Total: running };
  });
}
