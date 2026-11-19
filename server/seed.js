// Fills the database with a few months of demo data so charts have something to show.
// Run with: npm run seed
const db = require('./db');

const count = db.prepare('SELECT COUNT(*) AS n FROM transactions').get().n;
if (count > 0 && !process.argv.includes('--force')) {
  console.log(`Database already has ${count} transactions. Use "node seed.js --force" to add demo data anyway.`);
  process.exit(0);
}

const pad = (n) => String(n).padStart(2, '0');
const insert = db.prepare('INSERT INTO transactions (type, amount, category, note, date) VALUES (?, ?, ?, ?, ?)');
const setBudget = db.prepare('INSERT OR REPLACE INTO budgets (category, month, amount) VALUES (?, ?, ?)');
const now = new Date();

db.transaction(() => {
  for (let back = 3; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const ym = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const day = (n) => `${ym}-${pad(n)}`;

    insert.run('income', 42000, 'Salary', 'Monthly pay', day(1));
    if (back % 2 === 0) insert.run('income', 8000 + back * 1500, 'Freelance', 'Website project', day(14));
    insert.run('expense', 12000, 'Rent', 'Room rent', day(2));
    insert.run('expense', 1800 + back * 150, 'Bills', 'Internet and electricity', day(5));
    insert.run('expense', 3200 + back * 400, 'Food', 'Groceries', day(8));
    insert.run('expense', 950, 'Food', 'Momo with friends', day(12));
    insert.run('expense', 1400, 'Transport', 'Bus pass and fuel', day(10));
    insert.run('expense', 2600 - back * 300, 'Shopping', 'Clothes', day(17));
    insert.run('expense', 1200, 'Entertainment', 'Movies', day(20));
    insert.run('expense', 2200, 'Education', 'Online course', day(22));

    setBudget.run('Food', ym, 5000);
    setBudget.run('Shopping', ym, 2500);
    setBudget.run('Transport', ym, 1600);
    setBudget.run('Entertainment', ym, 1500);
  }
})();

console.log('Demo data added.');
