import { monthLabel, shiftMonth, currentMonth } from '../utils.js';

export default function MonthPicker({ month, setMonth }) {
  return (
    <div className="month-picker">
      <button aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
      <span>{monthLabel(month, true)}</span>
      <button aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= currentMonth()}>›</button>
    </div>
  );
}
