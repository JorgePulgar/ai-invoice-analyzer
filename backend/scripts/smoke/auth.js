#!/usr/bin/env node
// Smoke test for auth flow (Block 1.1).
// Requires the server to be running at BASE_URL (default: http://localhost:3000).
// Usage: node scripts/smoke/auth.js

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function req(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, body: json };
}

function assert(condition, label) {
  if (!condition) {
    console.error(`  FAIL: ${label}`);
    process.exit(1);
  }
  console.log(`  PASS: ${label}`);
}

async function run() {
  const email = `smoke-${Date.now()}@test.com`;
  const password = 'smoke1234';

  console.log('--- register ---');
  const reg = await req('POST', '/api/auth/register', { email, password });
  assert(reg.status === 201, `register returns 201 (got ${reg.status})`);
  assert(reg.body.success === true, 'register success=true');
  assert(typeof reg.body.data.token === 'string', 'register returns token');
  assert(reg.body.data.user.email === email, 'register user.email matches');
  assert(typeof reg.body.data.user.id === 'number', 'register user.id is number');
  const token = reg.body.data.token;

  console.log('--- duplicate register → 409 ---');
  const dup = await req('POST', '/api/auth/register', { email, password });
  assert(dup.status === 409, `duplicate register returns 409 (got ${dup.status})`);

  console.log('--- invalid email → 400 ---');
  const badEmail = await req('POST', '/api/auth/register', { email: 'notanemail', password });
  assert(badEmail.status === 400, `invalid email returns 400 (got ${badEmail.status})`);

  console.log('--- short password → 400 ---');
  const shortPwd = await req('POST', '/api/auth/register', { email: `other-${Date.now()}@test.com`, password: 'short' });
  assert(shortPwd.status === 400, `short password returns 400 (got ${shortPwd.status})`);

  console.log('--- login ---');
  const login = await req('POST', '/api/auth/login', { email, password });
  assert(login.status === 200, `login returns 200 (got ${login.status})`);
  assert(typeof login.body.data.token === 'string', 'login returns token');

  console.log('--- login wrong password → 401 (same message) ---');
  const wrongPwd = await req('POST', '/api/auth/login', { email, password: 'wrongpassword' });
  assert(wrongPwd.status === 401, `wrong password returns 401 (got ${wrongPwd.status})`);

  console.log('--- login unknown email → 401 (same message) ---');
  const unknownEmail = await req('POST', '/api/auth/login', { email: 'nobody@test.com', password });
  assert(unknownEmail.status === 401, `unknown email returns 401 (got ${unknownEmail.status})`);
  assert(
    wrongPwd.body.error === unknownEmail.body.error,
    `wrong-password and unknown-email return identical message ("${wrongPwd.body.error}")`
  );

  console.log('--- protected endpoint with valid token → auth passes ---');
  const authed = await req('GET', '/api/facturas', null, token);
  assert(authed.status !== 401, `GET /api/facturas with token is not 401 (got ${authed.status})`);

  console.log('--- protected endpoint without token → 401 ---');
  const noToken = await req('GET', '/api/facturas');
  assert(noToken.status === 401, `GET /api/facturas without token returns 401 (got ${noToken.status})`);

  console.log('--- protected endpoint with tampered token → 401 ---');
  const tampered = await req('GET', '/api/facturas', null, token + 'x');
  assert(tampered.status === 401, `GET /api/facturas with tampered token returns 401 (got ${tampered.status})`);

  console.log('\nAll auth smoke tests passed.');
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
