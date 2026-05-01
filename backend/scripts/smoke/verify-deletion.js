#!/usr/bin/env node
// Verifies that uploads/ is always empty after every error path in POST /api/facturas/upload.
// Run with: node scripts/smoke/verify-deletion.js (server must be on :3000)

const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const FIXTURE = path.join(__dirname, 'fixtures/sample.pdf');

function uploadsIsEmpty() {
  const files = fs.readdirSync(UPLOADS_DIR).filter((f) => f !== '.gitkeep');
  if (files.length > 0) console.log('  [uploads/]', files);
  return files.length === 0;
}

function assert(condition, label) {
  if (!condition) { console.error(`  FAIL: ${label}`); process.exit(1); }
  console.log(`  PASS: ${label}`);
}

async function jsonReq(method, url, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
}

async function run() {
  // Register and get token
  const email = `delpaths-${Date.now()}@test.com`;
  const reg = await jsonReq('POST', `${BASE}/api/auth/register`, { email, password: 'smoke1234' });
  if (reg.status !== 201) { console.error('Register failed:', reg.body); process.exit(1); }
  const token = reg.body.data.token;

  // PATH 1: no file → 400
  console.log('--- Path 1: no file → 400 ---');
  {
    const res = await fetch(`${BASE}/api/facturas/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    assert(res.status === 400, `status 400 (got ${res.status}): ${body.error}`);
    assert(uploadsIsEmpty(), 'uploads/ empty');
  }

  // PATH 2: non-PDF MIME → 415
  console.log('--- Path 2: wrong MIME type → 415 ---');
  {
    const form = new FormData();
    form.append('file', new Blob(['not a pdf'], { type: 'text/plain' }), 'test.txt');
    const res = await fetch(`${BASE}/api/facturas/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const body = await res.json();
    assert(res.status === 415, `status 415 (got ${res.status}): ${body.error}`);
    assert(uploadsIsEmpty(), 'uploads/ empty');
  }

  // PATH 3: oversized file → 413
  console.log('--- Path 3: oversized file (11 MB) → 413 ---');
  {
    const bigBuf = Buffer.alloc(11 * 1024 * 1024, 0);
    const form = new FormData();
    form.append('file', new Blob([bigBuf], { type: 'application/pdf' }), 'big.pdf');
    const res = await fetch(`${BASE}/api/facturas/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const body = await res.json();
    assert(res.status === 413, `status 413 (got ${res.status}): ${body.error}`);
    assert(uploadsIsEmpty(), 'uploads/ empty');
  }

  // PATH 4: valid PDF + invalid Azure credentials → 502
  console.log('--- Path 4: valid PDF + invalid Azure creds → 502 ---');
  {
    if (!fs.existsSync(FIXTURE)) {
      console.error('Fixture missing. Run: node scripts/smoke/create-fixtures.js');
      process.exit(1);
    }
    const buf = fs.readFileSync(FIXTURE);
    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'application/pdf' }), 'sample.pdf');
    const res = await fetch(`${BASE}/api/facturas/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const body = await res.json();
    assert(res.status === 502, `status 502 (got ${res.status}): ${body.error}`);
    assert(uploadsIsEmpty(), 'uploads/ empty after Azure error');
  }

  console.log('\nAll deletion-path verifications passed.');
}

run().catch((err) => {
  console.error('Script crashed:', err);
  process.exit(1);
});
