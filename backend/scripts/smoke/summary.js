#!/usr/bin/env node
// Smoke test for Block 2.2: POST /api/facturas/:id/summary
// Requires live Azure AI Foundry credentials in .env.
// Usage: node scripts/smoke/summary.js

const path = require('path');

process.env.DATABASE_PATH = path.join(__dirname, '../../data/invoice-insights.db');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Guard: skip gracefully if Azure credentials are absent
const missingVars = ['AZURE_AI_ENDPOINT', 'AZURE_AI_API_KEY', 'AZURE_AI_DEPLOYMENT', 'AZURE_AI_API_VERSION']
  .filter((v) => !process.env[v]);
if (missingVars.length) {
  console.warn(`[summary smoke] Skipped — missing env vars: ${missingVars.join(', ')}`);
  process.exit(0);
}

const { getDb } = require('../../src/db/database');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function apiFetch(method, url, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers });
  return { status: res.status, body: await res.json() };
}

function assert(condition, label) {
  if (!condition) { console.error(`  FAIL: ${label}`); process.exit(1); }
  console.log(`  PASS: ${label}`);
}

function r2(n) { return Math.round(n * 100) / 100; }

function seedFactura(userId) {
  const db = getDb();
  const base = 1000;
  const ivaPct = 21;
  const irpfPct = 15;
  const iva  = r2(base * ivaPct / 100);
  const irpf = r2(base * irpfPct / 100);
  const total = r2(base + iva - irpf);
  const numero = `SUM-${Date.now()}`;
  const result = db.prepare(
    `INSERT INTO facturas
       (user_id, numero, fecha, emisor, receptor, concepto,
        base_imponible, iva_porcentaje, iva_cantidad,
        irpf_porcentaje, irpf_cantidad, total, moneda, tipo)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     RETURNING id`
  ).get(
    userId, numero, '2026-01-15', 'Mi Empresa SL', 'Cliente Test SL',
    'Consultoría estratégica enero 2026',
    base, ivaPct, iva, irpfPct, irpf, total, 'EUR', 'ingreso'
  );
  return result.id;
}

async function run() {
  const email = `summary-smoke-${Date.now()}@test.com`;

  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'smoke1234' }),
  });
  const regBody = await regRes.json();
  assert(regRes.status === 201, `register (got ${regRes.status})`);
  const token = regBody.data.token;
  const userId = regBody.data.user.id;

  const facturaId = seedFactura(userId);
  console.log(`  Seeded factura id=${facturaId}`);

  // --- First call: cache miss → Azure generates summary ---
  console.log('\n--- POST /api/facturas/:id/summary (cache miss) ---');
  const t0 = Date.now();
  const { status: s1, body: b1 } = await apiFetch('POST', `${BASE}/api/facturas/${facturaId}/summary`, token);
  const t1 = Date.now();
  assert(s1 === 200, `first call 200 (got ${s1})`);
  const summary1 = b1.data?.summary;
  assert(typeof summary1 === 'string' && summary1.length > 0, 'summary is a non-empty string');
  console.log(`  Summary (${t1 - t0}ms): "${summary1.slice(0, 80)}…"`);

  // Verify the summary was persisted to the DB
  const row = getDb().prepare('SELECT summary FROM facturas WHERE id = ?').get(facturaId);
  assert(row.summary === summary1, 'summary persisted to DB');

  // --- Second call: cache hit → no Azure call, same value ---
  console.log('\n--- POST /api/facturas/:id/summary (cache hit) ---');
  const t2 = Date.now();
  const { status: s2, body: b2 } = await apiFetch('POST', `${BASE}/api/facturas/${facturaId}/summary`, token);
  const t3 = Date.now();
  assert(s2 === 200, `second call 200 (got ${s2})`);
  assert(b2.data?.summary === summary1, 'cache hit returns identical summary');
  console.log(`  Cache hit response time: ${t3 - t2}ms (first call: ${t1 - t0}ms)`);
  assert(t3 - t2 < t1 - t0, 'cache hit is faster than the Azure call');

  // --- 404 on unknown factura ---
  console.log('\n--- 404 on unknown id ---');
  const { status: s3 } = await apiFetch('POST', `${BASE}/api/facturas/999999/summary`, token);
  assert(s3 === 404, `unknown id returns 404 (got ${s3})`);

  console.log('\nAll summary smoke tests passed.');
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
