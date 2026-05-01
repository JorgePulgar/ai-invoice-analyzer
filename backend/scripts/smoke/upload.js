#!/usr/bin/env node
// Smoke test for the upload & extraction flow (Block 1.2).
// Requires: server running at BASE_URL AND valid Azure AI Foundry credentials in .env.
// Usage: node scripts/smoke/upload.js

const fs = require('fs');
const path = require('path');
const { FormData, Blob } = require('node:buffer') || {};

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const FIXTURE = path.join(__dirname, 'fixtures', 'sample.pdf');

async function json(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}

async function uploadPdf(filePath, token) {
  const form = new FormData();
  const buf = fs.readFileSync(filePath);
  form.append('file', new Blob([buf], { type: 'application/pdf' }), path.basename(filePath));
  const res = await fetch(`${BASE}/api/facturas/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return { status: res.status, body: await res.json() };
}

function assert(condition, label) {
  if (!condition) { console.error(`  FAIL: ${label}`); process.exit(1); }
  console.log(`  PASS: ${label}`);
}

function uploadsIsEmpty() {
  const dir = path.join(__dirname, '../../uploads');
  const files = fs.readdirSync(dir).filter((f) => f !== '.gitkeep');
  return files.length === 0;
}

async function run() {
  if (!fs.existsSync(FIXTURE)) {
    console.error('Fixture not found. Run: node scripts/smoke/create-fixtures.js');
    process.exit(1);
  }

  const email = `upload-smoke-${Date.now()}@test.com`;
  const password = 'smoke1234';

  console.log('--- login ---');
  const reg = await json('POST', `${BASE}/api/auth/register`, { email, password });
  assert(reg.status === 201, `register (got ${reg.status})`);
  const token = reg.body.data.token;

  console.log('--- upload valid single-page PDF ---');
  const up = await uploadPdf(FIXTURE, token);
  assert(up.status === 201, `upload returns 201 (got ${up.status})`);
  assert(up.body.success === true, 'upload success=true');
  const f = up.body.data;
  assert(typeof f.id === 'number', 'factura.id is number');
  assert(typeof f.numero === 'string' && f.numero.length > 0, 'factura.numero present');
  assert(typeof f.fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f.fecha), 'factura.fecha YYYY-MM-DD');
  assert(['ingreso', 'gasto'].includes(f.tipo), `factura.tipo valid (${f.tipo})`);
  assert(typeof f.total === 'number', 'factura.total is number');
  assert(uploadsIsEmpty(), 'uploads/ is empty after successful upload');

  console.log('--- duplicate upload (same numero) → 409 ---');
  const dup = await uploadPdf(FIXTURE, token);
  assert(dup.status === 409, `duplicate upload returns 409 (got ${dup.status})`);
  assert(uploadsIsEmpty(), 'uploads/ is empty after 409');

  console.log('\nAll upload smoke tests passed.');
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
