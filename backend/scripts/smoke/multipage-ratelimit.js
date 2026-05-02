#!/usr/bin/env node
// Smoke test for Block 2.4: multi-page PDF support and upload rate limiting.
// Rate-limit tests always run (no Azure needed).
// Multi-page upload test runs only when Azure credentials are present.
// Usage: node scripts/smoke/multipage-ratelimit.js

const path = require('path');
const fs   = require('fs');

process.env.DATABASE_PATH = path.join(__dirname, '../../data/invoice-insights.db');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const HAS_AZURE = ['AZURE_AI_ENDPOINT', 'AZURE_AI_API_KEY', 'AZURE_AI_DEPLOYMENT', 'AZURE_AI_API_VERSION']
  .every((v) => process.env[v]);

async function apiFetch(method, url, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

function assert(condition, label) {
  if (!condition) { console.error(`  FAIL: ${label}`); process.exit(1); }
  console.log(`  PASS: ${label}`);
}

async function register() {
  const email = `mr-smoke-${Date.now()}-${Math.random().toString(36).slice(2,6)}@test.com`;
  const res = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'smoke1234' }),
  });
  const body = await res.json();
  if (res.status !== 201) throw new Error(`Register failed: ${JSON.stringify(body)}`);
  return body.data.token;
}

// POST /api/facturas/upload with no file — triggers 400 (no file) but the
// rate limiter increments the counter before validation.
async function uploadNoFile(token) {
  const res = await fetch(`${BASE}/api/facturas/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    // intentionally no body / multipart — multer gets nothing
  });
  return { status: res.status, body: await res.json() };
}

async function run() {
  // ─── Rate limiting ─────────────────────────────────────────────────────────
  console.log('\n--- Rate limiting: 11 requests, expect 429 on the 11th ---');

  // Use a fresh user so the counter starts at 0.
  const tokenRL = await register();
  assert(!!tokenRL, 'registered rate-limit test user');

  const LIMIT = Number(process.env.UPLOAD_RATE_LIMIT) || 10;

  let lastStatus;
  for (let i = 1; i <= LIMIT; i++) {
    const { status } = await uploadNoFile(tokenRL);
    // Expect 400 (no file) for each request within the limit.
    assert(status !== 429, `request ${i} of ${LIMIT}: not rate-limited (got ${status})`);
    lastStatus = status;
  }
  // The (LIMIT+1)th request must be rate-limited.
  const { status: s429, body: b429 } = await uploadNoFile(tokenRL);
  assert(s429 === 429, `request ${LIMIT + 1} returns 429 (got ${s429})`);
  assert(typeof b429.error === 'string', '429 response has error message');
  assert(b429.success === false, '429 response has success: false');
  console.log(`  Rate-limit triggered correctly after ${LIMIT} requests.`);

  // A second user must NOT be affected by the first user's counter.
  console.log('\n--- Rate limit is per-user (different user not blocked) ---');
  const tokenOther = await register();
  const { status: sOther } = await uploadNoFile(tokenOther);
  assert(sOther !== 429, `different user not rate-limited (got ${sOther})`);

  // ─── Multi-page PDF upload (Azure-dependent) ───────────────────────────────
  const fixturePath = path.join(__dirname, 'fixtures', 'sample-2page.pdf');
  if (!HAS_AZURE) {
    console.log('\n[multi-page upload test skipped — Azure credentials not set]');
  } else if (!fs.existsSync(fixturePath)) {
    console.warn(`\n[multi-page upload test skipped — fixture not found: ${fixturePath}]`);
    console.warn('  Run: node scripts/smoke/gen-2page-fixture.js');
  } else {
    console.log('\n--- Multi-page PDF upload ---');
    const tokenMP = await register();

    const form = new FormData();
    form.append(
      'file',
      new Blob([fs.readFileSync(fixturePath)], { type: 'application/pdf' }),
      'sample-2page.pdf'
    );
    const upRes = await fetch(`${BASE}/api/facturas/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tokenMP}` },
      body: form,
    });
    const upBody = await upRes.json();

    assert(upRes.status === 201, `2-page upload returns 201 (got ${upRes.status})`);
    assert(upBody.data?.draft !== undefined, 'response contains draft');
    assert(upBody.data.draft.status === 'pending', 'draft.status is pending');
    assert(typeof upBody.data.draft.numero === 'string', 'draft has extracted numero');
    assert(typeof upBody.data.draft.total  === 'number', 'draft has extracted total');
    console.log(`  Extracted from 2-page PDF: numero=${upBody.data.draft.numero}, total=${upBody.data.draft.total}`);
  }

  console.log('\nAll multipage-ratelimit smoke tests passed.');
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
