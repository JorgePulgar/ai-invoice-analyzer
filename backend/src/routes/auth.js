const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const { ok, fail } = require('../utils/response');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function formatUser(row) {
  return {
    id: row.id,
    email: row.email,
    created_at: row.created_at.replace(' ', 'T') + '.000Z',
  };
}

router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !EMAIL_RE.test(email)) {
      return fail(res, 'Invalid email format', 400);
    }
    if (!password || password.length < 8) {
      return fail(res, 'Password must be at least 8 characters', 400);
    }

    const db = getDb();
    const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
    const password_hash = await bcrypt.hash(password, rounds);

    let row;
    try {
      row = db
        .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?) RETURNING id, email, created_at')
        .get(email.toLowerCase(), password_hash);
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return fail(res, 'Email already registered', 409);
      }
      throw err;
    }

    const token = signToken({ id: row.id, email: row.email });
    return ok(res, { token, user: formatUser(row) }, 201);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return fail(res, 'Invalid credentials', 401);
    }

    const db = getDb();
    const row = db
      .prepare('SELECT id, email, password_hash, created_at FROM users WHERE email = ?')
      .get(email.toLowerCase());

    const INVALID = 'Invalid credentials';

    if (!row) {
      return fail(res, INVALID, 401);
    }

    const match = await bcrypt.compare(password, row.password_hash);
    if (!match) {
      return fail(res, INVALID, 401);
    }

    const token = signToken({ id: row.id, email: row.email });
    return ok(res, { token, user: formatUser(row) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
