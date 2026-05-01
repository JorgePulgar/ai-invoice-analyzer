#!/usr/bin/env node
// Smoke test for Block 2.1: suppliers endpoint, date-range params, facturas filters.
// Seeds facturas directly — Azure credentials NOT required.
// Usage: node scripts/smoke/suppliers-filters.js

const path = require('path');

process.env.DATABASE_PATH = path.join(__dirname, '../../data/invoice-insights.db');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { getDb } = require('../../src/db/database');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function apiFetch(method, url, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

function assert(condition, label) {
  if (!condition) { console.error(`  FAIL: ${label}`); process.exit(1); }
  console.log(`  PASS: ${label}`);
}

function r2(n) { return Math.round(n * 100) / 100; }

function seed(userId, { numero, fecha, emisor, receptor, tipo, base, ivaPct = 21, irpfPct = 0 }) {
  const db = getDb();
  const iva  = r2(base * ivaPct / 100);
  const irpf = r2(base * irpfPct / 100);
  const total = r2(base + iva - irpf);
  db.prepare(
    `INSERT INTO facturas
       (user_id, numero, fecha, emisor, receptor, concepto,
        base_imponible, iva_porcentaje, iva_cantidad,
        irpf_porcentaje, irpf_cantidad, total, moneda, tipo)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(userId, numero, fecha, emisor, receptor, 'Servicios',
    base, ivaPct, iva, irpfPct, irpf, total, 'EUR', tipo);
  return { base, iva, irpf, total };
}

async function run() {
  const year = new Date().getFullYear();
  const email = `sf-smoke-${Date.now()}@test.com`;

  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'smoke1234' }),
  });
  const regBody = await regRes.json();
  assert(regRes.status === 201, `register (got ${regRes.status})`);
  const token = regBody.data.token;
  const userId = regBody.data.user.id;

  const n = (s) => `SF-${Date.now()}-${s}`;
  const f = (m, d) => `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  // Income invoices (receptor = client)
  const i1 = seed(userId, { numero: n('I1'), fecha: f(1, 10), emisor: 'Mi Empresa SL', receptor: 'Cliente A SL', tipo: 'ingreso', base: 2000, irpfPct: 15 });
  const i2 = seed(userId, { numero: n('I2'), fecha: f(2, 15), emisor: 'Mi Empresa SL', receptor: 'Cliente B SL', tipo: 'ingreso', base: 3000 });
  const i3 = seed(userId, { numero: n('I3'), fecha: f(4,  5), emisor: 'Mi Empresa SL', receptor: 'Cliente A SL', tipo: 'ingreso', base: 1500 });

  // Expense invoices (emisor = supplier)
  const g1 = seed(userId, { numero: n('G1'), fecha: f(1, 20), emisor: 'Proveedor Alpha SL', receptor: 'Mi Empresa SL', tipo: 'gasto', base: 800  });
  const g2 = seed(userId, { numero: n('G2'), fecha: f(2, 10), emisor: 'Proveedor Beta SA',  receptor: 'Mi Empresa SL', tipo: 'gasto', base: 200  });
  const g3 = seed(userId, { numero: n('G3'), fecha: f(3, 15), emisor: 'Proveedor Alpha SL', receptor: 'Mi Empresa SL', tipo: 'gasto', base: 400  });
  const g4 = seed(userId, { numero: n('G4'), fecha: f(5,  8), emisor: 'Proveedor Beta SA',  receptor: 'Mi Empresa SL', tipo: 'gasto', base: 150  });

  const expAlpha = r2(g1.total + g3.total);
  const expBeta  = r2(g2.total + g4.total);

  // --- GET /api/analytics/suppliers ---
  console.log('\n--- GET /api/analytics/suppliers ---');
  const { status: s1, body: b1 } = await apiFetch('GET', `${BASE}/api/analytics/suppliers`, token);
  assert(s1 === 200, `suppliers 200 (got ${s1})`);
  const suppliers = b1.data.suppliers;
  assert(Array.isArray(suppliers), 'suppliers is array');
  const alpha = suppliers.find((s) => s.proveedor === 'Proveedor Alpha SL');
  const beta  = suppliers.find((s) => s.proveedor === 'Proveedor Beta SA');
  assert(alpha !== undefined,                  'Proveedor Alpha SL present');
  assert(alpha.gastado === expAlpha,           `Alpha gastado ${alpha?.gastado} === ${expAlpha}`);
  assert(alpha.num_facturas === 2,             `Alpha num_facturas 2 (got ${alpha?.num_facturas})`);
  assert(beta  !== undefined,                  'Proveedor Beta SA present');
  assert(beta.gastado === expBeta,             `Beta gastado ${beta?.gastado} === ${expBeta}`);
  // Alpha spent more → first in list
  assert(suppliers[0].proveedor === 'Proveedor Alpha SL', 'suppliers ordered by gastado DESC');
  // Income invoices must NOT appear
  assert(!suppliers.some((s) => s.proveedor === 'Mi Empresa SL'), 'no income in suppliers');

  // --- Date-range: summary filtered to Q1 only ---
  console.log('\n--- GET /api/analytics/summary?desde=&hasta= (Q1 only) ---');
  const q1From = `${year}-01-01`;
  const q1To   = `${year}-03-31`;
  const { status: s2, body: b2 } = await apiFetch('GET',
    `${BASE}/api/analytics/summary?desde=${q1From}&hasta=${q1To}`, token);
  assert(s2 === 200, `filtered summary 200 (got ${s2})`);
  const ds = b2.data;
  // Q1 income: i1 (Jan) + i2 (Feb); Q1 expenses: g1 (Jan) + g2 (Feb) + g3 (Mar)
  const q1Inc = r2(i1.total + i2.total);
  const q1Gst = r2(g1.total + g2.total + g3.total);
  assert(ds.ingresos_totales === q1Inc, `Q1 ingresos ${ds.ingresos_totales} === ${q1Inc}`);
  assert(ds.gastos_totales   === q1Gst, `Q1 gastos ${ds.gastos_totales} === ${q1Gst}`);

  // Filtered summary must differ from unfiltered
  const { status: s2u, body: b2u } = await apiFetch('GET', `${BASE}/api/analytics/summary`, token);
  assert(s2u === 200, 'unfiltered summary 200');
  assert(b2u.data.ingresos_totales !== ds.ingresos_totales, 'filtered ingresos differs from unfiltered');

  // --- Date-range: monthly filtered to Q1 ---
  console.log('\n--- GET /api/analytics/monthly?desde=&hasta= ---');
  const { status: s3, body: b3 } = await apiFetch('GET',
    `${BASE}/api/analytics/monthly?desde=${q1From}&hasta=${q1To}`, token);
  assert(s3 === 200, `filtered monthly 200 (got ${s3})`);
  assert(b3.data.length === 3, `3 months in Q1 (got ${b3.data?.length})`);
  assert(b3.data[0].mes === `${year}-01`, 'first month is Jan');
  assert(b3.data[2].mes === `${year}-03`, 'last month is Mar');

  // --- Bad date format → 400 ---
  console.log('\n--- Bad date format → 400 ---');
  const { status: s4 } = await apiFetch('GET', `${BASE}/api/analytics/summary?desde=not-a-date`, token);
  assert(s4 === 400, `bad desde returns 400 (got ${s4})`);
  const { status: s5 } = await apiFetch('GET', `${BASE}/api/analytics/monthly?hasta=2026/01/01`, token);
  assert(s5 === 400, `bad hasta returns 400 (got ${s5})`);

  // --- Date-range: suppliers filtered to Q1 ---
  console.log('\n--- GET /api/analytics/suppliers?desde=&hasta= ---');
  const { status: s6, body: b6 } = await apiFetch('GET',
    `${BASE}/api/analytics/suppliers?desde=${q1From}&hasta=${q1To}`, token);
  assert(s6 === 200, `filtered suppliers 200 (got ${s6})`);
  const suppQ1 = b6.data.suppliers;
  // g4 (May) is excluded; only g2 (Feb) counts for Beta in Q1
  const betaQ1 = suppQ1.find((s) => s.proveedor === 'Proveedor Beta SA');
  assert(betaQ1 !== undefined,       'Beta SA present in Q1');
  assert(betaQ1.num_facturas === 1,  'Beta in Q1 has 1 factura (g4 in May excluded)');

  // --- GET /api/facturas filters ---
  console.log('\n--- GET /api/facturas filter params ---');

  // tipo filter
  const { status: sf1, body: bf1 } = await apiFetch('GET', `${BASE}/api/facturas?tipo=ingreso`, token);
  assert(sf1 === 200, 'facturas?tipo=ingreso 200');
  assert(bf1.data.facturas.length === 3, `3 income facturas (got ${bf1.data.facturas?.length})`);
  assert(bf1.data.facturas.every((f) => f.tipo === 'ingreso'), 'all tipo=ingreso');

  const { status: sf2, body: bf2 } = await apiFetch('GET', `${BASE}/api/facturas?tipo=gasto`, token);
  assert(sf2 === 200, 'facturas?tipo=gasto 200');
  assert(bf2.data.facturas.length === 4, `4 expense facturas (got ${bf2.data.facturas?.length})`);

  // cliente filter (substring on receptor)
  const { status: sf3, body: bf3 } = await apiFetch('GET', `${BASE}/api/facturas?cliente=Cliente+A`, token);
  assert(sf3 === 200, 'facturas?cliente=Cliente+A 200');
  assert(bf3.data.facturas.length === 2, `2 facturas for Cliente A (got ${bf3.data.facturas?.length})`);
  assert(bf3.data.facturas.every((f) => f.receptor.includes('Cliente A')), 'all match Cliente A');

  // proveedor filter (substring on emisor)
  const { status: sf4, body: bf4 } = await apiFetch('GET', `${BASE}/api/facturas?proveedor=Alpha`, token);
  assert(sf4 === 200, 'facturas?proveedor=Alpha 200');
  assert(bf4.data.facturas.length === 2, `2 facturas from Alpha (got ${bf4.data.facturas?.length})`);

  // importe_min filter
  const { status: sf5, body: bf5 } = await apiFetch('GET', `${BASE}/api/facturas?importe_min=2000`, token);
  assert(sf5 === 200, 'facturas?importe_min=2000 200');
  assert(bf5.data.facturas.every((f) => f.total >= 2000), 'all total >= 2000');

  // combined filters
  const { status: sf6, body: bf6 } = await apiFetch('GET', `${BASE}/api/facturas?tipo=ingreso&importe_min=2000`, token);
  assert(sf6 === 200, 'combined tipo+importe_min 200');
  assert(bf6.data.facturas.every((f) => f.tipo === 'ingreso' && f.total >= 2000), 'combined filter correct');

  // bad tipo → 400
  const { status: sf7 } = await apiFetch('GET', `${BASE}/api/facturas?tipo=otro`, token);
  assert(sf7 === 400, `bad tipo returns 400 (got ${sf7})`);

  // bad importe_min → 400
  const { status: sf8 } = await apiFetch('GET', `${BASE}/api/facturas?importe_min=abc`, token);
  assert(sf8 === 400, `bad importe_min returns 400 (got ${sf8})`);

  console.log('\nAll suppliers-filters smoke tests passed.');
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
