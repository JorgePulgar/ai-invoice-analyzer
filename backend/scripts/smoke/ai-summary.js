#!/usr/bin/env node
// Smoke test for GET /api/analytics/ai-summary (Block 3.1).
// Requires a running backend server AND valid Azure AI Foundry credentials.
// Usage: node scripts/smoke/ai-summary.js

const path = require('path');

process.env.DATABASE_PATH = path.join(__dirname, '../../data/invoice-insights.db');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { getDb } = require('../../src/db/database');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function req(method, url, token) {
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

function seed(userId, { numero, fecha, receptor, tipo, base, ivaPct, irpfPct }) {
  const db = getDb();
  const iva = r2(base * ivaPct / 100);
  const irpf = r2(base * irpfPct / 100);
  const total = r2(base + iva - irpf);
  db.prepare(
    `INSERT INTO facturas
       (user_id, numero, fecha, emisor, receptor, concepto,
        base_imponible, iva_porcentaje, iva_cantidad,
        irpf_porcentaje, irpf_cantidad, total, moneda, tipo)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(userId, numero, fecha, 'Mi Empresa SL', receptor, 'Servicios',
    base, ivaPct, iva, irpfPct, irpf, total, 'EUR', tipo);
}

async function run() {
  const email = `ai-summary-smoke-${Date.now()}@test.com`;
  const regFetch = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'smoke1234' }),
  });
  const regBody = await regFetch.json();
  assert(regFetch.status === 201, `register (got ${regFetch.status})`);
  const token = regBody.data.token;
  const userId = regBody.data.user.id;

  // --- Case 1: no facturas — should return null ---
  console.log('\n--- No facturas → null ---');
  const { status: s0, body: b0 } = await req('GET', `${BASE}/api/analytics/ai-summary`, token);
  assert(s0 === 200, `status 200 (got ${s0})`);
  assert(b0.data.summary === null, 'summary is null when no facturas');

  // --- Seed facturas ---
  const year = new Date().getFullYear();
  const f = (m, d) => `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const n = (s) => `AIS-${Date.now()}-${s}`;
  seed(userId, { numero: n('I1'), fecha: f(1, 10), receptor: 'Cliente A SL', tipo: 'ingreso', base: 3000, ivaPct: 21, irpfPct: 15 });
  seed(userId, { numero: n('I2'), fecha: f(2, 15), receptor: 'Cliente B SL', tipo: 'ingreso', base: 1500, ivaPct: 21, irpfPct: 0  });
  seed(userId, { numero: n('G1'), fecha: f(1, 20), receptor: 'Proveedor X',  tipo: 'gasto',   base: 400,  ivaPct: 21, irpfPct: 0  });

  // --- Case 2: first call — generates from Azure ---
  console.log('\n--- First call (Azure generation) ---');
  const { status: s1, body: b1 } = await req('GET', `${BASE}/api/analytics/ai-summary`, token);
  assert(s1 === 200, `status 200 (got ${s1})`);
  assert(b1.data.summary !== null, 'summary is not null');
  const narrative1 = b1.data.summary.narrative;
  const generatedAt1 = b1.data.summary.generated_at;
  assert(typeof narrative1 === 'string' && narrative1.length > 0, 'narrative is a non-empty string');
  assert(typeof generatedAt1 === 'string' && !isNaN(Date.parse(generatedAt1)), 'generated_at is a valid ISO date');
  console.log(`  narrative: "${narrative1.slice(0, 80)}..."`);

  // --- Case 3: second call within 24h — must return the cached entry ---
  console.log('\n--- Second call (cache hit) ---');
  const { status: s2, body: b2 } = await req('GET', `${BASE}/api/analytics/ai-summary`, token);
  assert(s2 === 200, `status 200 (got ${s2})`);
  assert(b2.data.summary.narrative === narrative1, 'narrative identical (cache hit)');
  assert(b2.data.summary.generated_at === generatedAt1, 'generated_at identical (cache hit)');

  // --- Case 4: delete all facturas, endpoint should return null ---
  console.log('\n--- After deleting all facturas → null ---');
  getDb().prepare('DELETE FROM facturas WHERE user_id = ?').run(userId);
  const { status: s3, body: b3 } = await req('GET', `${BASE}/api/analytics/ai-summary`, token);
  assert(s3 === 200, `status 200 (got ${s3})`);
  assert(b3.data.summary === null, 'summary is null after all facturas deleted');

  console.log('\nAll ai-summary smoke tests passed.');
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
