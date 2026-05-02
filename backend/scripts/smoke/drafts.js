#!/usr/bin/env node
// Smoke test for Block 2.3: drafts validation flow.
// Core tests seed drafts directly (no Azure needed).
// Upload tests run only when Azure credentials are present.
// Usage: node scripts/smoke/drafts.js

const path = require('path');

process.env.DATABASE_PATH = path.join(__dirname, '../../data/invoice-insights.db');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { getDb } = require('../../src/db/database');

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

function r2(n) { return Math.round(n * 100) / 100; }

function seedDraft(userId, overrides = {}) {
  const db = getDb();
  const base = overrides.base ?? 1000;
  const ivaPct = 21;
  const irpfPct = 15;
  const iva  = r2(base * ivaPct / 100);
  const irpf = r2(base * irpfPct / 100);
  const total = r2(base + iva - irpf);
  const numero = overrides.numero ?? `DR-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

  const row = db.prepare(
    `INSERT INTO facturas_draft
       (user_id, numero, fecha, emisor, receptor, concepto,
        base_imponible, iva_porcentaje, iva_cantidad,
        irpf_porcentaje, irpf_cantidad, total, moneda, tipo)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     RETURNING *`
  ).get(
    userId, numero, '2026-03-01', 'Mi Empresa SL', 'Cliente Draft SL',
    'Consultoría', base, ivaPct, iva, irpfPct, irpf, total, 'EUR', 'ingreso'
  );
  return row;
}

function validBody(draft) {
  // Returns all confirmed fields (mirroring the draft), suitable for confirm body.
  return {
    numero: draft.numero, fecha: draft.fecha,
    emisor: draft.emisor, receptor: draft.receptor, concepto: draft.concepto,
    base_imponible: draft.base_imponible, iva_porcentaje: draft.iva_porcentaje,
    iva_cantidad: draft.iva_cantidad, irpf_porcentaje: draft.irpf_porcentaje,
    irpf_cantidad: draft.irpf_cantidad, total: draft.total,
    moneda: draft.moneda, tipo: draft.tipo,
  };
}

async function run() {
  const email = `drafts-smoke-${Date.now()}@test.com`;
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'smoke1234' }),
  });
  const regBody = await regRes.json();
  assert(regRes.status === 201, `register (got ${regRes.status})`);
  const token = regBody.data.token;
  const userId = regBody.data.user.id;

  // ─── 1. List drafts (empty) ───────────────────────────────────────────────
  console.log('\n--- GET /api/facturas/drafts (empty) ---');
  const { status: sl0, body: bl0 } = await apiFetch('GET', `${BASE}/api/facturas/drafts`, token);
  assert(sl0 === 200, `list 200 (got ${sl0})`);
  assert(Array.isArray(bl0.data.drafts) && bl0.data.drafts.length === 0, 'starts empty');

  // ─── 2. Seed draft → GET shows it ────────────────────────────────────────
  console.log('\n--- Seed draft → GET /api/facturas/drafts ---');
  const draft1 = seedDraft(userId);
  const { status: sl1, body: bl1 } = await apiFetch('GET', `${BASE}/api/facturas/drafts`, token);
  assert(sl1 === 200, `list 200 (got ${sl1})`);
  assert(bl1.data.drafts.length === 1, `1 draft (got ${bl1.data.drafts?.length})`);
  assert(bl1.data.drafts[0].id === draft1.id, 'draft id matches');
  assert(bl1.data.drafts[0].status === 'pending', 'status is pending');

  // ─── 3. Confirm with original fields → promoted to facturas ──────────────
  console.log('\n--- POST /api/facturas/drafts/:id/confirm (original fields) ---');
  const { status: sc1, body: bc1 } = await apiFetch(
    'POST', `${BASE}/api/facturas/drafts/${draft1.id}/confirm`, token, validBody(draft1)
  );
  assert(sc1 === 201, `confirm 201 (got ${sc1})`);
  const promoted = bc1.data;
  assert(promoted.numero === draft1.numero, 'promoted numero matches');
  assert(promoted.total  === draft1.total,  'promoted total matches');
  assert(!('status' in promoted), 'promoted row has no status field (it is a factura)');
  // Draft must be gone
  const { body: bl2 } = await apiFetch('GET', `${BASE}/api/facturas/drafts`, token);
  assert(bl2.data.drafts.length === 0, 'draft removed after confirm');
  // Verify in facturas
  const { body: bf1 } = await apiFetch('GET', `${BASE}/api/facturas`, token);
  assert(bf1.data.facturas.some((f) => f.id === promoted.id), 'promoted id present in GET /facturas');

  // ─── 4. Confirm with an edited field ─────────────────────────────────────
  console.log('\n--- POST confirm with edited numero ---');
  const draft2 = seedDraft(userId);
  const editedBody = { ...validBody(draft2), numero: `EDITED-${Date.now()}` };
  const { status: sc2, body: bc2 } = await apiFetch(
    'POST', `${BASE}/api/facturas/drafts/${draft2.id}/confirm`, token, editedBody
  );
  assert(sc2 === 201, `confirm with edit 201 (got ${sc2})`);
  assert(bc2.data.numero === editedBody.numero, 'saved row reflects edited numero');

  // ─── 5. Confirm with invalid total → 400 ─────────────────────────────────
  console.log('\n--- POST confirm with invalid total → 400 ---');
  const draft3 = seedDraft(userId);
  const badBody = { ...validBody(draft3), total: 99999.99 };
  const { status: sc3, body: bc3 } = await apiFetch(
    'POST', `${BASE}/api/facturas/drafts/${draft3.id}/confirm`, token, badBody
  );
  assert(sc3 === 400, `invalid total returns 400 (got ${sc3})`);
  assert(typeof bc3.error === 'string' && bc3.error.includes('Total mismatch'), 'error message mentions Total mismatch');
  // Draft must still exist (not deleted on validation failure)
  const { body: bl3 } = await apiFetch('GET', `${BASE}/api/facturas/drafts`, token);
  assert(bl3.data.drafts.some((d) => d.id === draft3.id), 'draft preserved after failed confirm');

  // ─── 6. Confirm with missing required field → 400 ────────────────────────
  console.log('\n--- POST confirm with missing field → 400 ---');
  const draft4 = seedDraft(userId);
  const { numero: _n, ...bodyNoNumero } = validBody(draft4);
  const { status: sc4 } = await apiFetch(
    'POST', `${BASE}/api/facturas/drafts/${draft4.id}/confirm`, token, bodyNoNumero
  );
  assert(sc4 === 400, `missing field returns 400 (got ${sc4})`);

  // ─── 7. Reject (DELETE) a draft ──────────────────────────────────────────
  console.log('\n--- DELETE /api/facturas/drafts/:id (reject) ---');
  // Use draft3 (still pending from step 5)
  const { status: sd1 } = await apiFetch('DELETE', `${BASE}/api/facturas/drafts/${draft3.id}`, token);
  assert(sd1 === 200, `reject 200 (got ${sd1})`);
  const { status: sd2 } = await apiFetch('DELETE', `${BASE}/api/facturas/drafts/${draft3.id}`, token);
  assert(sd2 === 404, `second reject returns 404 (got ${sd2})`);

  // ─── 8. 404 on unknown draft id ──────────────────────────────────────────
  console.log('\n--- 404 on unknown draft ---');
  const { status: su1 } = await apiFetch(
    'POST', `${BASE}/api/facturas/drafts/999999/confirm`, token, validBody(draft1)
  );
  assert(su1 === 404, `unknown confirm returns 404 (got ${su1})`);

  // ─── 9. Upload → draft (Azure-dependent) ─────────────────────────────────
  if (!HAS_AZURE) {
    console.log('\n[upload tests skipped — Azure credentials not set]');
  } else {
    const FormData = (await import('node:formdata-polyfill/esm.min.js').catch(() => null))?.FormData
      ?? (await import('undici').then(m => m.FormData).catch(() => null))
      ?? globalThis.FormData;

    const fixturePath = path.join(__dirname, 'fixtures', 'sample.pdf');
    if (!require('fs').existsSync(fixturePath)) {
      console.log('\n[upload tests skipped — fixtures/sample.pdf not found]');
    } else {
      console.log('\n--- POST /api/facturas/upload → returns draft ---');
      const form = new FormData();
      form.append('file', new Blob([require('fs').readFileSync(fixturePath)], { type: 'application/pdf' }), 'sample.pdf');
      const upRes = await fetch(`${BASE}/api/facturas/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const upBody = await upRes.json();
      assert(upRes.status === 201, `upload 201 (got ${upRes.status})`);
      assert(upBody.data?.draft !== undefined, 'response has draft key (not direct factura)');
      assert(upBody.data.draft.status === 'pending', 'draft.status is pending');
      assert(!('summary' in upBody.data.draft), 'draft has no summary field');

      const uploadedDraftId = upBody.data.draft.id;
      // Confirm it appears in GET /drafts
      const { body: blUp } = await apiFetch('GET', `${BASE}/api/facturas/drafts`, token);
      assert(blUp.data.drafts.some((d) => d.id === uploadedDraftId), 'uploaded draft in list');

      // Confirm it
      const confirmBody = { ...upBody.data.draft };
      delete confirmBody.id;
      delete confirmBody.status;
      delete confirmBody.created_at;
      delete confirmBody.user_id;
      const { status: scUp, body: bcUp } = await apiFetch(
        'POST', `${BASE}/api/facturas/drafts/${uploadedDraftId}/confirm`, token, confirmBody
      );
      assert(scUp === 201, `upload+confirm 201 (got ${scUp})`);
      assert(bcUp.data.id !== undefined, 'promoted factura has id');
    }
  }

  console.log('\nAll drafts smoke tests passed.');
}

run().catch((err) => {
  console.error('Smoke test crashed:', err);
  process.exit(1);
});
