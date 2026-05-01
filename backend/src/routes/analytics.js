const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getDb } = require('../db/database');
const { getSummary, getMonthly, getTopClients, getVatBreakdown } = require('../services/metrics');
const { ok } = require('../utils/response');

const router = express.Router();

router.use(authenticate);

router.get('/summary', async (req, res, next) => {
  try {
    return ok(res, getSummary(getDb(), req.user.id));
  } catch (err) {
    next(err);
  }
});

router.get('/monthly', async (req, res, next) => {
  try {
    return ok(res, getMonthly(getDb(), req.user.id));
  } catch (err) {
    next(err);
  }
});

router.get('/clients', async (req, res, next) => {
  try {
    return ok(res, getTopClients(getDb(), req.user.id));
  } catch (err) {
    next(err);
  }
});

router.get('/vat', async (req, res, next) => {
  try {
    return ok(res, getVatBreakdown(getDb(), req.user.id));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
