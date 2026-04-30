const express = require('express');
const { fail } = require('../utils/response');

const router = express.Router();

// POST /api/auth/register
// body: { email, password }
// 201 → { success: true, data: { token, user: { id, email } } }
router.post('/register', async (req, res, next) => {
  try {
    return fail(res, 'Not implemented', 501);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
// body: { email, password }
// 200 → { success: true, data: { token, user: { id, email } } }
router.post('/login', async (req, res, next) => {
  try {
    return fail(res, 'Not implemented', 501);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
