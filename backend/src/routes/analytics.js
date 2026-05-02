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

router.get('/alerts', async (req, res, next) => {
  try {
    const db = getDb();
    const userId = req.user.id;
    const alerts = [];

    const summary = getSummary(db, userId, {});
    const clients = getTopClients(db, userId, 1, {});

    // Client concentration: top client > 50 % of total income.
    if (summary.ingresos_totales > 0 && clients.length > 0) {
      const ratio = Math.round((clients[0].facturado / summary.ingresos_totales) * 100) / 100;
      if (ratio > 0.5) {
        alerts.push({ type: 'client_concentration', current: ratio, cliente: clients[0].cliente });
      }
    }

    // VAT due soon: today within 15 days before a quarter end and iva_a_pagar > 0.
    const vat = getVatBreakdown(db, userId, {});
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = today.getFullYear();
    const quarterEnds = [
      { trimestre: 'T1', end: new Date(year, 2, 31) },
      { trimestre: 'T2', end: new Date(year, 5, 30) },
      { trimestre: 'T3', end: new Date(year, 8, 30) },
      { trimestre: 'T4', end: new Date(year, 11, 31) },
    ];
    for (const { trimestre, end } of quarterEnds) {
      const daysRemaining = Math.round((end - today) / 86_400_000);
      if (daysRemaining >= 0 && daysRemaining <= 15) {
        const q = vat.find((v) => v.trimestre === trimestre);
        if (q && q.iva_a_pagar > 0) {
          alerts.push({ type: 'vat_due', days_remaining: daysRemaining, trimestre, iva_a_pagar: q.iva_a_pagar });
        }
        break;
      }
    }

    // IRPF annual: December and irpf_retenido > 0.
    if (today.getMonth() === 11 && summary.irpf_retenido > 0) {
      alerts.push({ type: 'irpf_annual', irpf_retenido: summary.irpf_retenido });
    }

    return ok(res, { alerts });
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
