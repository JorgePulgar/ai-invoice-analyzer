#!/usr/bin/env node
// Smoke test for analytics endpoints (Block 1.4).
// Seeds facturas directly so Azure credentials are NOT required.
// Usage: node scripts/smoke/analytics.js

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

// Seed a factura directly into the DB
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
  return { base, iva, irpf, total };
}

async function run() {
  const now = new Date();
  const year = now.getFullYear();
  const email = `analytics-smoke-${Date.now()}@test.com`;

  const regRes = await req('POST', `${BASE}/api/auth/register`, null);
  // Use JSON body manually
  const regFetch = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'smoke1234' }),
  });
  const regBody = await regFetch.json();
  assert(regFetch.status === 201, `register (got ${regFetch.status})`);
  const token = regBody.data.token;
  const userId = regBody.data.user.id;

  // Seed 8 facturas:  5 income, 3 expense, spanning Q1+Q2 of current year
  const n = (s) => `AN-${Date.now()}-${s}`;
  const f = (m, d) => `${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const i1 = seed(userId, { numero: n('I1'), fecha: f(1, 10), receptor: 'Cliente A SL',   tipo: 'ingreso', base: 1000, ivaPct: 21, irpfPct: 15 });
  const i2 = seed(userId, { numero: n('I2'), fecha: f(2, 15), receptor: 'Cliente B SL',   tipo: 'ingreso', base: 2000, ivaPct: 21, irpfPct: 0  });
  const i3 = seed(userId, { numero: n('I3'), fecha: f(3, 20), receptor: 'Cliente A SL',   tipo: 'ingreso', base: 1500, ivaPct: 21, irpfPct: 15 });
  const i4 = seed(userId, { numero: n('I4'), fecha: f(4,  5), receptor: 'Cliente C SL',   tipo: 'ingreso', base: 3000, ivaPct: 21, irpfPct: 0  });
  const i5 = seed(userId, { numero: n('I5'), fecha: f(5, 12), receptor: 'Cliente A SL',   tipo: 'ingreso', base: 500,  ivaPct: 21, irpfPct: 15 });
  const g1 = seed(userId, { numero: n('G1'), fecha: f(1, 20), receptor: 'Proveedor X SL', tipo: 'gasto',   base: 200,  ivaPct: 21, irpfPct: 0  });
  const g2 = seed(userId, { numero: n('G2'), fecha: f(3,  5), receptor: 'Proveedor Y SL', tipo: 'gasto',   base: 100,  ivaPct: 10, irpfPct: 0  });
  const g3 = seed(userId, { numero: n('G3'), fecha: f(4, 25), receptor: 'Proveedor X SL', tipo: 'gasto',   base: 400,  ivaPct: 21, irpfPct: 0  });

  const expIngresos   = r2(i1.total + i2.total + i3.total + i4.total + i5.total);
  const expGastos     = r2(g1.total + g2.total + g3.total);
  const expIvaRep     = r2(i1.iva + i2.iva + i3.iva + i4.iva + i5.iva);
  const expIvaSop     = r2(g1.iva + g2.iva + g3.iva);
  const expIrpf       = r2(i1.irpf + i3.irpf + i5.irpf); // only on income invoices

  console.log('\n--- GET /api/analytics/summary ---');
  const { status: s1, body: b1 } = await req('GET', `${BASE}/api/analytics/summary`, token);
  assert(s1 === 200, `summary 200 (got ${s1})`);
  const d = b1.data;
  assert(d.ingresos_totales === expIngresos, `ingresos_totales ${d.ingresos_totales} === ${expIngresos}`);
  assert(d.gastos_totales   === expGastos,   `gastos_totales ${d.gastos_totales} === ${expGastos}`);
  assert(d.beneficio_neto   === r2(expIngresos - expGastos), `beneficio_neto correct`);
  assert(d.iva_repercutido  === expIvaRep,   `iva_repercutido ${d.iva_repercutido} === ${expIvaRep}`);
  assert(d.iva_soportado    === expIvaSop,   `iva_soportado ${d.iva_soportado} === ${expIvaSop}`);
  assert(d.iva_a_pagar      === r2(expIvaRep - expIvaSop), `iva_a_pagar correct`);
  assert(d.irpf_retenido    === expIrpf,     `irpf_retenido ${d.irpf_retenido} === ${expIrpf}`);
  assert(d.num_facturas     === 8,           `num_facturas 8 (got ${d.num_facturas})`);
  assert(d.num_clientes     === 3,           `num_clientes 3 (got ${d.num_clientes})`);
  assert(typeof d.periodo.desde === 'string', 'periodo.desde present');
  assert(typeof d.periodo.hasta === 'string', 'periodo.hasta present');

  console.log('\n--- GET /api/analytics/monthly ---');
  const { status: s2, body: b2 } = await req('GET', `${BASE}/api/analytics/monthly`, token);
  assert(s2 === 200, `monthly 200 (got ${s2})`);
  assert(Array.isArray(b2.data) && b2.data.length === 12, `12 months (got ${b2.data?.length})`);
  const jan = b2.data.find((m) => m.mes === `${year}-01`);
  const feb = b2.data.find((m) => m.mes === `${year}-02`);
  assert(jan && jan.ingresos === i1.total, `Jan ingresos ${jan?.ingresos} === ${i1.total}`);
  assert(jan && jan.gastos   === g1.total, `Jan gastos ${jan?.gastos} === ${g1.total}`);
  assert(feb && feb.ingresos === i2.total, `Feb ingresos correct`);
  assert(feb && feb.gastos   === 0,        `Feb gastos 0`);
  // All 12 entries present
  assert(b2.data.every((m) => typeof m.mes === 'string' && 'ingresos' in m && 'gastos' in m), 'all months have required fields');

  console.log('\n--- GET /api/analytics/clients ---');
  const { status: s3, body: b3 } = await req('GET', `${BASE}/api/analytics/clients`, token);
  assert(s3 === 200, `clients 200 (got ${s3})`);
  const clients = b3.data;
  assert(Array.isArray(clients), 'clients is array');
  // Cliente A appears 3 times (i1, i3, i5), should be top client
  const clA = clients.find((c) => c.cliente === 'Cliente A SL');
  assert(clA !== undefined, 'Cliente A SL present');
  assert(clA.num_facturas === 3, `Cliente A num_facturas 3 (got ${clA?.num_facturas})`);
  assert(clients[0].facturado >= clients[1]?.facturado, 'clients ordered by facturado DESC');
  // Proveedor rows must NOT appear (expenses excluded)
  assert(!clients.some((c) => c.cliente.startsWith('Proveedor')), 'no expenses in clients');

  console.log('\n--- GET /api/analytics/vat ---');
  const { status: s4, body: b4 } = await req('GET', `${BASE}/api/analytics/vat`, token);
  assert(s4 === 200, `vat 200 (got ${s4})`);
  const vat = b4.data;
  assert(Array.isArray(vat) && vat.length === 4, `4 quarters (got ${vat?.length})`);
  assert(vat.every((q) => ['T1','T2','T3','T4'].includes(q.trimestre)), 'all quarters present');
  assert(vat.every((q) => q.anio === year), 'all quarters have current year');
  const q3 = vat.find((q) => q.trimestre === 'T3');
  assert(q3 && q3.iva_repercutido === 0 && q3.iva_soportado === 0, 'T3 zeros (no data)');
  const q1 = vat.find((q) => q.trimestre === 'T1');
  const q1ExpRep = r2(i1.iva + i2.iva + i3.iva); // Jan + Feb + Mar all fall in Q1
  const q1ExpSop = r2(g1.iva + g2.iva);
  assert(q1.iva_repercutido === q1ExpRep, `T1 iva_repercutido ${q1.iva_repercutido} === ${q1ExpRep}`);
  assert(q1.iva_soportado   === q1ExpSop, `T1 iva_soportado ${q1.iva_soportado} === ${q1ExpSop}`);
  assert(q1.iva_a_pagar === r2(q1ExpRep - q1ExpSop), 'T1 iva_a_pagar correct');

  console.log('\nAll analytics smoke tests passed.');
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
