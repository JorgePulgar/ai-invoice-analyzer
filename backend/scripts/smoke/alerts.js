#!/usr/bin/env node
// Smoke test for GET /api/analytics/alerts (Block 4.2).
// Seeds data directly in SQLite — no Azure calls needed.
// Usage: node scripts/smoke/alerts.js

const path = require('path');
process.env.DATABASE_PATH = path.join(__dirname, '../../data/invoice-insights.db');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { getDb } = require('../../src/db/database');
const BASE = process.env.BASE_URL || 'http://localhost:3000';

function assert(condition, label) {
  if (!condition) { console.error(`  FAIL: ${label}`); process.exit(1); }
  console.log(`  PASS: ${label}`);
}

function r2(n) { return Math.round(n * 100) / 100; }

function insertFactura(db, userId, { numero, fecha, emisor, receptor, tipo, base, ivaPct }) {
  const iva = r2(base * ivaPct / 100);
  db.prepare(
    `INSERT OR REPLACE INTO facturas
       (user_id, numero, fecha, emisor, receptor, concepto,
        base_imponible, iva_porcentaje, iva_cantidad,
        irpf_porcentaje, irpf_cantidad, total, moneda, tipo)
     VALUES (?,?,?,?,?,?,?,?,?,0,0,?,?,?)`
  ).run(userId, numero, fecha, emisor, receptor, 'Servicios',
    base, ivaPct, iva, r2(base + iva), 'EUR', tipo);
}

function deleteAllFacturas(db, userId) {
  db.prepare('DELETE FROM facturas WHERE user_id = ?').run(userId);
}

async function apiFetch(method, url, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}

async function run() {
  const ts = Date.now();
  const email = `alerts-smoke-${ts}@test.com`;

  // Register a test user.
  const { status: regStatus, body: regBody } = await apiFetch(
    'POST', `${BASE}/api/auth/register`, null, { email, password: 'smoke1234' }
  );
  assert(regStatus === 201, `register (got ${regStatus})`);
  const token = regBody.data.token;
  const userId = regBody.data.user.id;
  const db = getDb();

  // ─── Scenario 1: dominant single client (> 50 % of income) ───────────────
  console.log('\n--- Scenario 1: single dominant client ---');
  deleteAllFacturas(db, userId);

  const f = (y, m, d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  // Big client: 70 % of income
  insertFactura(db, userId, { numero: `A${ts}-1`, fecha: f(2026,1,10), emisor: 'My Co SL', receptor: 'Dominant SA',  tipo: 'ingreso', base: 7000, ivaPct: 21 });
  // Small client: 30 %
  insertFactura(db, userId, { numero: `A${ts}-2`, fecha: f(2026,2,15), emisor: 'My Co SL', receptor: 'Other SA',     tipo: 'ingreso', base: 3000, ivaPct: 21 });

  const { status: s1, body: b1 } = await apiFetch('GET', `${BASE}/api/analytics/alerts`, token);
  assert(s1 === 200, `alerts 200 (got ${s1})`);
  const alerts1 = b1.data.alerts;
  assert(Array.isArray(alerts1), 'alerts is array');
  const cc = alerts1.find((a) => a.type === 'client_concentration');
  assert(cc !== undefined, 'client_concentration alert present');
  assert(cc.current > 0.5, `client_concentration ratio > 0.5 (got ${cc?.current})`);
  assert(cc.cliente === 'Dominant SA', `correct client name (got ${cc?.cliente})`);
  console.log(`  client_concentration: ratio=${cc.current}, cliente=${cc.cliente}`);

  // ─── Scenario 2: balanced clients — no concentration alert ───────────────
  console.log('\n--- Scenario 2: balanced clients (no alerts) ---');
  deleteAllFacturas(db, userId);

  for (let i = 1; i <= 4; i++) {
    insertFactura(db, userId, { numero: `B${ts}-${i}`, fecha: f(2026,1,i), emisor: 'My Co SL', receptor: `Client${i} SA`, tipo: 'ingreso', base: 2500, ivaPct: 21 });
  }

  const { status: s2, body: b2 } = await apiFetch('GET', `${BASE}/api/analytics/alerts`, token);
  assert(s2 === 200, `alerts 200 (got ${s2})`);
  const alerts2 = b2.data.alerts;
  const cc2 = alerts2.find((a) => a.type === 'client_concentration');
  assert(!cc2, `no client_concentration alert when balanced (each 25 %)`);
  console.log(`  alerts array length: ${alerts2.length} (client_concentration absent ✓)`);

  // ─── Scenario 3: empty data — always empty alerts ─────────────────────────
  console.log('\n--- Scenario 3: no facturas ---');
  deleteAllFacturas(db, userId);

  const { status: s3, body: b3 } = await apiFetch('GET', `${BASE}/api/analytics/alerts`, token);
  assert(s3 === 200, `alerts 200 (got ${s3})`);
  assert(b3.data.alerts.length === 0, 'empty alerts when no facturas');
  console.log(`  alerts: []`);

  console.log('\nAll alerts smoke tests passed.');
}

run().catch((err) => {
  console.error('Alerts smoke test crashed:', err.message);
  process.exit(1);
});
