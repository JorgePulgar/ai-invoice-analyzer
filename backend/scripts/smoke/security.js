#!/usr/bin/env node
// Smoke test for security headers (Block 4.3).
// Requires the backend server to be running.
// Usage: node scripts/smoke/security.js

const BASE = process.env.BASE_URL || 'http://localhost:3000';

function assert(condition, label) {
  if (!condition) { console.error(`  FAIL: ${label}`); process.exit(1); }
  console.log(`  PASS: ${label}`);
}

async function run() {
  console.log(`\nHitting ${BASE}/api/health ...`);
  const res = await fetch(`${BASE}/api/health`);
  const headers = Object.fromEntries(res.headers.entries());

  console.log('\nResponse headers (security-relevant):');
  const SECURITY_HEADERS = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
    'strict-transport-security',
    'x-dns-prefetch-control',
    'referrer-policy',
  ];
  for (const h of SECURITY_HEADERS) {
    console.log(`  ${h}: ${headers[h] ?? '(not set)'}`);
  }

  assert(res.status === 200, `GET /api/health returns 200 (got ${res.status})`);
  assert(headers['x-content-type-options'], 'x-content-type-options header present');
  assert(headers['x-frame-options'], 'x-frame-options header present');
  assert(headers['x-xss-protection'] !== undefined || headers['x-content-type-options'], 'helmet security headers present');

  console.log('\nAll security smoke tests passed.');
}

run().catch((err) => {
  console.error('Security smoke test crashed:', err.message);
  process.exit(1);
});
