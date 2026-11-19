const crypto = require('crypto');
const express = require('express');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const SESSION_COOKIE = 'fintrack_session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const DUMMY_PASSWORD_HASH = `scrypt$${Buffer.alloc(16).toString('hex')}$${Buffer.alloc(64).toString('hex')}`;
const authAttempts = new Map();

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function rateLimitAuth(req, res, next) {
  const now = Date.now();
  for (const [ip, attempt] of authAttempts) {
    if (attempt.resetAt <= now) authAttempts.delete(ip);
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  let attempt = authAttempts.get(ip);
  if (!attempt || attempt.resetAt <= now) {
    attempt = { count: 0, resetAt: now + 15 * 60 * 1000 };
    authAttempts.set(ip, attempt);
  }

  if (attempt.count >= 15) {
    res.set('Retry-After', String(Math.ceil((attempt.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Too many attempts. Try again later.' });
  }
  attempt.count += 1;
  next();
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  const [, saltHex, expectedHex] = storedHash.split('$');
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  if (salt.length !== 16 || expected.length !== 64) return false;
  const derived = await scrypt(password, salt, expected.length, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return crypto.timingSafeEqual(derived, expected);
}

function cookieToken(req) {
  const prefix = `${SESSION_COOKIE}=`;
  const entry = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : '';
}

function secureRequest(req) {
  return req.secure || req.get('x-forwarded-proto') === 'https';
}

function setSessionCookie(req, res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: secureRequest(req),
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION_MS,
  });
}

function createAuth(db) {
  const router = express.Router();

  router.post('/signup', rateLimitAuth, asyncRoute(async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!validEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (typeof password !== 'string' || password.length < 12 || password.length > 128) {
      return res.status(400).json({ error: 'Password must be 12 to 128 characters.' });
    }

    const passwordHash = await hashPassword(password);
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

    let user;
    try {
      user = db.transaction(() => {
        const isFirstUser = db.prepare('SELECT COUNT(*) AS count FROM users').get().count === 0;
        const result = db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)').run(email, passwordHash);
        const userId = Number(result.lastInsertRowid);
        if (isFirstUser) {
          db.prepare('UPDATE transactions SET user_id = ? WHERE user_id IS NULL').run(userId);
          db.prepare('UPDATE budgets SET user_id = ? WHERE user_id IS NULL').run(userId);
        }
        db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
          .run(tokenHash, userId, expiresAt);
        return { id: userId, email };
      })();
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'An account with that email already exists.' });
      }
      throw error;
    }

    setSessionCookie(req, res, token);
    res.status(201).json(user);
  }));

  router.post('/login', rateLimitAuth, asyncRoute(async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    const password = req.body?.password;
    if (!email || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email);
    const passwordMatches = await verifyPassword(password, user?.password_hash || DUMMY_PASSWORD_HASH);
    if (!user || !passwordMatches) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
    db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(tokenHash, user.id, expiresAt);
    setSessionCookie(req, res, token);
    res.json({ id: user.id, email: user.email });
  }));

  router.post('/logout', (req, res) => {
    const token = cookieToken(req);
    if (token) {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    }
    res.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      secure: secureRequest(req),
      sameSite: 'strict',
      path: '/',
    });
    res.status(204).end();
  });

  router.get('/me', (req, res) => {
    const token = cookieToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = db.prepare(`
      SELECT users.id, users.email
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `).get(tokenHash, new Date().toISOString());
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    res.json(user);
  });

  function requireAuth(req, res, next) {
    const token = cookieToken(req);
    if (!token) return res.status(401).json({ error: 'Authentication required.' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = db.prepare(`
      SELECT users.id, users.email
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `).get(tokenHash, new Date().toISOString());
    if (!user) return res.status(401).json({ error: 'Authentication required.' });
    req.user = user;
    next();
  }

  return { router, requireAuth };
}

module.exports = createAuth;
