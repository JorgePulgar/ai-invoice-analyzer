const express = require('express');
const { authenticate } = require('../middleware/auth');
const { fail } = require('../utils/response');

const router = express.Router();

router.use(authenticate);

// GET /api/analytics/summary
router.get('/summary', async (req, res, next) => {
  try {
    return fail(res, 'Not implemented', 501);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/monthly
router.get('/monthly', async (req, res, next) => {
  try {
    return fail(res, 'Not implemented', 501);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/clients
router.get('/clients', async (req, res, next) => {
  try {
    return fail(res, 'Not implemented', 501);
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/vat
router.get('/vat', async (req, res, next) => {
  try {
    return fail(res, 'Not implemented', 501);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
