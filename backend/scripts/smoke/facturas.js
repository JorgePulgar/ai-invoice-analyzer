#!/usr/bin/env node
// Smoke test for listing & deletion (Block 1.3).
// Seeds facturas directly via the DB so Azure credentials are NOT required.
// Usage: node scripts/smoke/facturas.js

const path = require('path');

process.env.DATABASE_PATH = path.join(__dirname, '../../data/invoice-insights.db');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { getDb } = require('../../src/db/database');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function req(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}

function assert(condition, label) {
  if (!condition) { console.error(`  FAIL: ${label}`); process.exit(1); }
  console.log(`  PASS: ${label}`);
}

function seedFactura(userId, numero) {
  const db = getDb();
  return db.prepare(
    `INSERT INTO facturas
       (user_id, numero, fecha, emisor, receptor, concepto,
        base_imponible, iva_porcentaje, iva_cantidad,
        irpf_porcentaje, irpf_cantidad, total, moneda, tipo)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).run(userId, numero, '2026-01-15', 'Emisor SL', 'Receptor SL', 'Consultoría',
    1000, 21, 210, 0, 0, 1210, 'EUR', 'ingreso');
}

async function run() {
  const email = `facturas-smoke-${Date.now()}@test.com`;
  const password = 'smoke1234';

  console.log('--- register ---');
  const reg = await req('POST', `${BASE}/api/auth/register`, { email, password });
  assert(reg.status === 201, `register (got ${reg.status})`);
  const token = reg.body.data.token;
  const userId = reg.body.data.user.id;

  console.log('--- seed 2 facturas directly ---');
  const r1 = seedFactura(userId, `F-SMOKE-${Date.now()}-A`);
  const r2 = seedFactura(userId, `F-SMOKE-${Date.now()}-B`);
  assert(r1.changes === 1, 'seeded factura A');
  assert(r2.changes === 1, 'seeded factura B');

  console.log('--- GET /api/facturas → 2 results ---');
  const list1 = await req('GET', `${BASE}/api/facturas`, null, token);
  assert(list1.status === 200, `GET returns 200 (got ${list1.status})`);
  assert(Array.isArray(list1.body.data.facturas), 'data.facturas is array');
  assert(list1.body.data.facturas.length === 2, `2 facturas returned (got ${list1.body.data.facturas.length})`);
  const firstId = list1.body.data.facturas[0].id;

  console.log('--- DELETE one factura → 200 ---');
  const del = await req('DELETE', `${BASE}/api/facturas/${firstId}`, null, token);
  assert(del.status === 200, `DELETE returns 200 (got ${del.status})`);
  assert(del.body.data.id === firstId, `returned id matches (${del.body.data.id})`);

  console.log('--- GET /api/facturas → 1 result ---');
  const list2 = await req('GET', `${BASE}/api/facturas`, null, token);
  assert(list2.status === 200, `GET returns 200 after delete`);
  assert(list2.body.data.facturas.length === 1, `1 factura remaining (got ${list2.body.data.facturas.length})`);

  console.log('--- DELETE already-deleted → 404 ---');
  const del2 = await req('DELETE', `${BASE}/api/facturas/${firstId}`, null, token);
  assert(del2.status === 404, `re-delete returns 404 (got ${del2.status})`);

  console.log('--- DELETE another user\'s factura → 404 ---');
  const reg2 = await req('POST', `${BASE}/api/auth/register`, {
    email: `other-${Date.now()}@test.com`, password: 'smoke1234',
  });
  const token2 = reg2.body.data.token;
  const userId2 = reg2.body.data.user.id;
  const r3 = seedFactura(userId2, `F-SMOKE-${Date.now()}-C`);
  assert(r3.changes === 1, 'seeded factura C for user2');
  const user2FacturaId = getDb()
    .prepare('SELECT id FROM facturas WHERE user_id = ? ORDER BY id DESC LIMIT 1')
    .get(userId2).id;

  const crossDel = await req('DELETE', `${BASE}/api/facturas/${user2FacturaId}`, null, token);
  assert(crossDel.status === 404, `cross-user delete returns 404 (got ${crossDel.status}) — same message, no enumeration`);

  // Verify user2 can still delete their own factura
  const ownDel = await req('DELETE', `${BASE}/api/facturas/${user2FacturaId}`, null, token2);
  assert(ownDel.status === 200, `user2 can delete own factura (got ${ownDel.status})`);

  console.log('\nAll listing & deletion smoke tests passed.');
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
