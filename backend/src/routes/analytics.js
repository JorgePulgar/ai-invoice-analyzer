const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getDb } = require('../db/database');
const { getSummary, getMonthly, getTopClients, getTopSuppliers, getVatBreakdown } = require('../services/metrics');
const { ok, fail } = require('../utils/response');
const { parseDateParam } = require('../utils/validate');

const router = express.Router();

router.use(authenticate);

// Parses desde/hasta from req.query, returns { desde, hasta } or responds 400.
function resolveDateRange(req, res) {
  const desde = parseDateParam(req.query.desde);
  if (desde === false) {
    fail(res, '"desde" must be a valid date (YYYY-MM-DD)', 400);
    return null;
  }
  const hasta = parseDateParam(req.query.hasta);
  if (hasta === false) {
    fail(res, '"hasta" must be a valid date (YYYY-MM-DD)', 400);
    return null;
  }
  return { desde: desde ?? undefined, hasta: hasta ?? undefined };
}

router.get('/summary', async (req, res, next) => {
  try {
    const opts = resolveDateRange(req, res);
    if (!opts) return;
    return ok(res, getSummary(getDb(), req.user.id, opts));
  } catch (err) {
    next(err);
  }
});

router.get('/monthly', async (req, res, next) => {
  try {
    const opts = resolveDateRange(req, res);
    if (!opts) return;
    return ok(res, getMonthly(getDb(), req.user.id, opts));
  } catch (err) {
    next(err);
  }
});

router.get('/clients', async (req, res, next) => {
  try {
    const opts = resolveDateRange(req, res);
    if (!opts) return;
    return ok(res, getTopClients(getDb(), req.user.id, 10, opts));
  } catch (err) {
    next(err);
  }
});

router.get('/suppliers', async (req, res, next) => {
  try {
    const opts = resolveDateRange(req, res);
    if (!opts) return;
    return ok(res, { suppliers: getTopSuppliers(getDb(), req.user.id, 10, opts) });
  } catch (err) {
    next(err);
  }
});

router.get('/vat', async (req, res, next) => {
  try {
    const opts = resolveDateRange(req, res);
    if (!opts) return;
    return ok(res, getVatBreakdown(getDb(), req.user.id, opts));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
