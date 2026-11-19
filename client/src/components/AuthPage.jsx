import { useState } from 'react';
import { api } from '../api.js';

export default function AuthPage({ mode }) {
  const isSignUp = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (isSignUp && password !== confirmPassword) {
      setError('Those passwords don’t match.');
      return;
    }

    setSubmitting(true);
    try {
      if (isSignUp) await api.signUp(email, password);
      else await api.logIn(email, password);
      window.location.assign('/app');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <a className="brand landing-brand auth-brand" href="/" aria-label="FinTrack home">
        <span className="brand-mark">F</span>
        <span className="brand-name">FinTrack</span>
      </a>
      <section className="auth-card">
        <p className="eyebrow">{isSignUp ? 'A fresh start' : 'Welcome back'}</p>
        <h1>{isSignUp ? 'Create your account' : 'Log in to FinTrack'}</h1>
        <p className="auth-subtitle">
          {isSignUp ? 'Set up your space to start tracking your money.' : 'Pick up where you left off.'}
        </p>

        <form onSubmit={submit}>
          <label>
            Email address
            <input
              type="email"
              name="email"
              autoComplete="email"
              maxLength={254}
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              minLength={isSignUp ? 12 : undefined}
              maxLength={128}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {isSignUp && (
            <label>
              Confirm password
              <input
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                minLength={12}
                maxLength={128}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <span className="field-hint">Use at least 12 characters.</span>
            </label>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn primary auth-submit" type="submit" disabled={submitting}>
            {submitting ? 'Please wait…' : isSignUp ? 'Create account' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          {isSignUp ? 'Already have an account?' : 'New to FinTrack?'}{' '}
          <a href={isSignUp ? '/login' : '/signup'}>{isSignUp ? 'Log in' : 'Create an account'}</a>
        </p>
        <p className="demo-disclaimer auth-disclaimer">
          Demo only: accounts and records are temporary and can be reset. Don’t use real financial information.
        </p>
      </section>
      <a className="back-home" href="/">← Back to home</a>
    </main>
  );
}
