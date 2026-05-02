const express = require('express');
const { authenticate } = require('../middleware/auth');
const { getDb } = require('../db/database');
const { getSummary, getMonthly, getTopClients, getTopSuppliers, getVatBreakdown } = require('../services/metrics');
const { generateDashboardNarrative } = require('../services/dashboardSummary');
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

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

router.get('/ai-summary', async (req, res, next) => {
  try {
    const db = getDb();

    const countRow = db.prepare('SELECT COUNT(*) AS n FROM facturas WHERE user_id = ?').get(req.user.id);
    if (countRow.n === 0) return ok(res, { summary: null });

    const cached = db
      .prepare('SELECT narrative, generated_at FROM ai_summary_cache WHERE user_id = ?')
      .get(req.user.id);
    if (cached && Date.now() - new Date(cached.generated_at).getTime() < CACHE_TTL_MS) {
      return ok(res, { summary: { narrative: cached.narrative, generated_at: cached.generated_at } });
    }

    const summary = getSummary(db, req.user.id, {});
    const monthly = getMonthly(db, req.user.id, {});
    const clients = getTopClients(db, req.user.id, 3, {});

    let narrative;
    try {
      narrative = await generateDashboardNarrative(summary, monthly, clients);
    } catch (err) {
      if (err.isAzureError) return fail(res, err.message, 502);
      throw err;
    }

    const generated_at = new Date().toISOString();

    db.prepare(
      `INSERT INTO ai_summary_cache (user_id, narrative, generated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET narrative = excluded.narrative, generated_at = excluded.generated_at`
    ).run(req.user.id, narrative, generated_at);

    return ok(res, { summary: { narrative, generated_at } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
