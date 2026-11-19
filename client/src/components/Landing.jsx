const FEATURES = [
  {
    number: '01',
    title: 'See the whole picture',
    description: 'Understand your balance, monthly cash flow, and saving rate at a glance.',
  },
  {
    number: '02',
    title: 'Spend with intention',
    description: 'Set category budgets and see how your spending moves through the month.',
  },
  {
    number: '03',
    title: 'Keep your records close',
    description: 'Search transactions, import a CSV, and take your data with you.',
  },
];

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <a className="brand landing-brand" href="/" aria-label="FinTrack home">
          <span className="brand-mark">F</span>
          <span className="brand-name">FinTrack</span>
        </a>
        <nav className="landing-actions" aria-label="Account">
          <a className="btn ghost" href="/login">Log in</a>
          <a className="btn primary" href="/signup">Create account</a>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <p className="eyebrow"><span /> A calmer way to handle money</p>
            <h1>Make room for what matters.</h1>
            <p className="landing-lede">
              A clear view of your income, everyday spending, and monthly goals — all in one simple place.
            </p>
            <div className="landing-actions">
              <a className="btn primary" href="/signup">Start your free demo <span aria-hidden="true">→</span></a>
              <a className="text-link" href="/login">Already have an account? Log in</a>
            </div>
            <p className="demo-disclaimer">Free demo accounts and records may be reset at any time. Don’t use real financial information.</p>
          </div>

          <div className="landing-preview" aria-label="FinTrack dashboard preview">
            <div className="preview-top">
              <div>
                <span className="preview-kicker">YOUR OVERVIEW</span>
                <strong>This month</strong>
              </div>
              <span className="preview-pill">November</span>
            </div>
            <div className="preview-balance">
              <span>Total balance</span>
              <strong>Rs. 84,250</strong>
              <div className="preview-chart" aria-hidden="true">
                <span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span /><span />
              </div>
            </div>
            <div className="preview-stats">
              <div><span className="preview-dot income" /> Money in <strong>Rs. 1,20,000</strong></div>
              <div><span className="preview-dot expense" /> Money out <strong>Rs. 35,750</strong></div>
            </div>
            <div className="preview-budget">
              <div><span>Monthly budget</span><strong>68%</strong></div>
              <div className="preview-track"><span /></div>
              <small>On track this month</small>
            </div>
            <div className="preview-spark" aria-hidden="true">✳</div>
          </div>
        </section>

        <section className="landing-features">
          <div className="section-intro">
            <p className="eyebrow">Less guesswork, more clarity</p>
            <h2>Good money habits start with a clear view.</h2>
          </div>
          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article className="feature-card" key={feature.number}>
                <span className="feature-number">{feature.number}</span>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="brand landing-brand" href="/">
          <span className="brand-mark">F</span>
          <span className="brand-name">FinTrack</span>
        </a>
        <p>Simple tools for a more intentional relationship with money.</p>
      </footer>
    </div>
  );
}
