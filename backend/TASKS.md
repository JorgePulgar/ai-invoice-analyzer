# TASKS — Backend

Work queue for the backend developer. Follow the per-task and per-block flows from the root `CLAUDE.md`.

## Phase 1 — MVP

### Block 1.1 — Authentication

- [x] Implement `POST /api/auth/register`
  - File: `src/routes/auth.js`
  - Validate `email` (basic regex) and `password` (≥ 8 chars). Return 400 on validation errors.
  - Hash with bcrypt using `BCRYPT_ROUNDS`.
  - Insert into `users`. On `UNIQUE` constraint violation, return 409 "Email already registered".
  - On success, return 201 with `{ token, user: { id, email, created_at } }`.
- [x] Implement `POST /api/auth/login`
  - File: `src/routes/auth.js`
  - Look up user by email. If not found OR password mismatch, return 401 "Invalid credentials" (same message — no user enumeration).
  - On success, return 200 with `{ token, user: { id, email, created_at } }`.
- [x] Implement JWT auth middleware
  - File: `src/middleware/auth.js`
  - Read `Authorization: Bearer <token>`. Verify with `JWT_SECRET`.
  - On success, set `req.user = { id, email }` and `next()`.
  - On failure (missing, malformed, expired), return 401 "Unauthorized".
- [x] Smoke test for auth flow
  - File: `scripts/smoke/auth.sh` (curl-based) OR `scripts/smoke/auth.js`.
  - Sequence: register a fresh user → login → call a protected endpoint with the token → call without the token (expect 401) → call with a tampered token (expect 401).
  - Capture the run output in the commit body of this task.

**Block 1.1 closes with**: `git push origin dev-backend`.

---

### Block 1.2 — Upload & extraction

Pre-requisite: Block 1.1 complete and merged into `dev-backend`.

- [x] Implement `services/extractor.js`
  - File: `src/services/extractor.js`
  - Read PDF as base64.
  - POST to Azure AI Foundry chat-completions with `response_format: { type: "json_object" }` and a system prompt pinning the extractor output JSON shape (from `docs/api-contract.md`).
  - Parse and validate per the contract's validation rules. Throw with a clear message on failure.
  - **Reject multi-page PDFs** with a clear error (multi-page support is Phase 2+).
  - Do NOT delete the PDF here.
- [x] Implement `POST /api/facturas/upload`
  - File: `src/routes/facturas.js`
  - Apply auth middleware + multer single-file middleware.
  - Wrap business logic in `try { ... } finally { fs.unlink(filePath, () => {}) }`. The `finally` deletes the PDF on every path (success, validation error, Azure error, DB error).
  - On extraction success, insert into `facturas`. On `UNIQUE(user_id, numero)` violation, return 409.
  - Return 201 with the inserted factura (full row, including `id` and `created_at`).
  - Map errors: extractor validation → 400; Azure failure → 502; multer rejections (size/type) → 413/415 via `errorHandler`.
- [x] Verify PDF deletion under all error paths
  - Manually trigger each error path (invalid file, oversized file, duplicate numero, simulated Azure 500). After each, confirm `uploads/` is empty.
  - Capture the verification commands and outputs in the commit body.
- [x] Smoke test for upload flow
  - File: `scripts/smoke/upload.js`, fixture under `scripts/smoke/fixtures/sample.pdf` (synthetic, single-page).
  - Login, upload, assert response shape matches contract, assert DB row exists, assert `uploads/` directory is empty.

**Block 1.2 closes with**: `git push origin dev-backend`.

> **Human-dependent dependency:** Azure AI Foundry deployment must exist before this block can be smoke-tested. If credentials are not yet set up, pause Block 1.2 after the code is written but before the smoke test, and request the Azure setup from the human. Do not mark the smoke-test task `[x]` based on a partial check.

---

### Block 1.3 — Listing & deletion

Pre-requisite: Block 1.2 complete.

- [x] Implement `GET /api/facturas`
  - File: `src/routes/facturas.js`
  - Return all facturas for `req.user.id`, ordered by `fecha DESC, id DESC`.
  - Response payload: `{ facturas: [...] }`.
- [x] Implement `DELETE /api/facturas/:id`
  - File: `src/routes/facturas.js`
  - Run `DELETE FROM facturas WHERE id = ? AND user_id = ?`. If `result.changes === 0`, return 404 "Not found".
  - On success, return 200 with `{ id }`.
- [x] Smoke test for listing & deletion
  - File: `scripts/smoke/facturas.js`.
  - Insert two facturas via the DB (or via upload if extractor is wired), list (assert 2), delete one (assert 200), list again (assert 1), attempt to delete a non-owned factura (assert 404).

**Block 1.3 closes with**: `git push origin dev-backend`.

---

### Block 1.4 — Analytics

Pre-requisite: Block 1.3 complete.

- [x] Implement `getSummary` in `services/metrics.js`
  - File: `src/services/metrics.js`
  - Compute every field listed in the contract's summary section.
  - Single SQL query when feasible (use `SUM(CASE WHEN tipo = 'ingreso' THEN ... END)` patterns).
- [x] Implement `getMonthly`
  - Last 12 months including the current one. Months with no data appear with `0.00` (do not skip). Format `YYYY-MM`.
  - Strategy: generate the 12-month range in JS, left-join against a SQL grouping by `strftime('%Y-%m', fecha)`.
- [x] Implement `getTopClients`
  - Income only (`tipo = 'ingreso'`). Group by `receptor`. Order by `SUM(total) DESC`. Default limit 10.
- [x] Implement `getVatBreakdown`
  - Current calendar year, 4 quarters. Empty quarters with zeros.
  - `iva_a_pagar = iva_repercutido - iva_soportado`.
- [x] Wire up routes
  - File: `src/routes/analytics.js`. Each route calls the corresponding metrics function and wraps the result in `ok(res, ...)`.
- [x] Smoke test for analytics
  - File: `scripts/smoke/analytics.js`.
  - Seed 5–10 facturas spanning multiple months and quarters (income + expense). Hit each of the 4 endpoints. Compare key totals against expected values computed in the script.

**Block 1.4 closes with**: `git push origin dev-backend`. **End of Phase 1.** Open a PR from `dev-backend` to `main` summarising the phase.

---

## Phase 2

### Block 2.1 — Suppliers endpoint & filter query params

Pre-requisite: Phase 1 merged to `main`.

- [x] Update `docs/api-contract.md` with new endpoints and query params
  - Add `GET /api/analytics/suppliers` shape (mirrors clients, using `emisor` / `gasto`).
  - Document `desde` / `hasta` query params on all analytics endpoints.
  - Document `tipo`, `cliente`, `proveedor`, `importe_min` params on `GET /api/facturas`.
  - **Coordinate with the frontend developer before touching the contract.**
- [x] Implement `getTopSuppliers` in `src/services/metrics.js`
  - Expenses only (`tipo = 'gasto'`). Group by `emisor`. Order by `SUM(total) DESC`. Default limit 10.
  - Accepts optional `{ desde, hasta }` date range; apply to all subsequent metrics functions too.
- [x] Wire `GET /api/analytics/suppliers`
  - File: `src/routes/analytics.js`. Calls `getTopSuppliers`, wraps in `ok(res, ...)`.
  - Response shape: `{ suppliers: [{ proveedor, gastado, num_facturas }] }`.
- [x] Add `desde` / `hasta` query params to all analytics routes
  - Routes: `summary`, `monthly`, `clients`, `suppliers`, `vat`.
  - Validate format (`YYYY-MM-DD`); return 400 on bad format. Ignore if absent (return full dataset).
  - Pass the validated range down to every `metrics.js` function.
  - Monthly still fills missing months with `0.00` within the requested range (12-month max).
- [x] Add filter params to `GET /api/facturas`
  - Params: `tipo` (`ingreso|gasto`), `cliente` (substring on `receptor`), `proveedor` (substring on `emisor`), `importe_min` (number).
  - All optional and combinable. Use `LIKE '%?%'` with prepared statements; never concatenate.
- [x] Smoke test for suppliers & filters
  - File: `scripts/smoke/suppliers-filters.js`.
  - Seed diverse facturas (income + expenses, multiple clients/suppliers). Call suppliers endpoint; assert order and totals. Call analytics with `desde`/`hasta`; assert filtered totals differ from unfiltered. Call filtered `GET /api/facturas`; assert row counts.

**Block 2.1 closes with**: `git push origin dev-backend`.

---

### Block 2.2 — AI summary endpoint

Pre-requisite: Block 2.1 complete.

- [x] Add `summary` column to `facturas` table
  - File: `src/db/schema.sql`. Add `summary TEXT` (nullable) to the `facturas` table definition.
  - Migration note: column is nullable, so existing rows are unaffected. Document in `LESSONS.md` if `better-sqlite3` requires any migration step.
- [x] Implement `POST /api/facturas/:id/summary`
  - File: `src/routes/facturas.js`.
  - Fetch factura by `id` and `user_id`; return 404 if not found.
  - If `summary` column is already populated, return it directly (cache hit — no Azure call).
  - Otherwise, call Azure AI Foundry (GPT-4o) with a prompt requesting a financial narrative ≤ 3 sentences about the invoice's fiscal impact. Store the result in the `summary` column.
  - Response: `{ summary: "..." }` wrapped in the standard envelope.
- [x] Smoke test for AI summary
  - File: `scripts/smoke/summary.js`.
  - Upload a factura, call the summary endpoint, assert a non-empty string. Call again; assert the response is identical (cache hit, no second Azure call — verify via log/timing).

**Block 2.2 closes with**: `git push origin dev-backend`.

---

### Block 2.3 — Validation flow (mandatory draft stage)

Pre-requisite: Block 2.1 complete.

> **Design decision:** every upload now goes through a mandatory human-validation step before being committed to `facturas`. The upload endpoint no longer writes directly to `facturas`; it always writes to `facturas_draft` and returns the draft for the user to review and edit.

- [x] Update `docs/api-contract.md` to reflect the new upload response and draft endpoints
  - `POST /api/facturas/upload` now returns 201 with the **draft** row (same shape as before but scoped to `facturas_draft`, includes `draft_id`). Coordinate with the frontend developer before merging.
- [x] Add `facturas_draft` table to schema
  - File: `src/db/schema.sql`. Same columns as `facturas` plus `status TEXT NOT NULL DEFAULT 'pending'` (`pending | confirmed | rejected`). No `UNIQUE` constraint on `numero` (draft is not committed yet).
- [x] Change `POST /api/facturas/upload` to always write to `facturas_draft`
  - Remove any direct insert into `facturas` from this route.
  - On extraction success, insert into `facturas_draft`. Return 201 with `{ draft: <draft row> }`.
  - PDF deletion in `finally` still applies on every path (success, extraction error, DB error).
  - Errors: extractor validation → 400; Azure failure → 502; multer rejections → 413/415.
- [x] Implement `GET /api/facturas/drafts`
  - Return all `status = 'pending'` drafts for `req.user.id`, ordered by `id DESC`.
  - Response: `{ drafts: [...] }`.
- [x] Implement `POST /api/facturas/drafts/:id/confirm`
  - Body: all factura fields (user may have edited any of them in the UI). Re-validate the submitted values using the same rules the extractor applies (field presence, date format, `tipo`, IRPF sign, total tolerance).
  - On validation failure, return 400 with a descriptive message — do not commit.
  - On success, insert into `facturas`, delete from `facturas_draft`. On `UNIQUE(user_id, numero)` violation, return 409. Return 201 with the promoted factura row.
- [x] Implement `DELETE /api/facturas/drafts/:id`
  - Delete the draft (scoped to `req.user.id`). Return 200 with `{ id }`, or 404 if not found / wrong user.
- [x] Smoke test for validation flow
  - File: `scripts/smoke/drafts.js`.
  - Upload a PDF → assert response is a draft (not a final factura). GET drafts → assert it appears. Confirm with the original fields → assert promoted factura exists in `facturas`. Upload again → confirm with an edited field (change `numero`) → assert the saved row reflects the edit. Upload a third → confirm with an invalid `total` → assert 400. Reject a draft → assert 200 and GET drafts returns empty.

**Block 2.3 closes with**: `git push origin dev-backend`.

---

### Block 2.4 — Multi-page PDF & rate limiting

Pre-requisite: Block 2.1 complete.

- [x] Multi-page PDF support in extractor
  - Add `pdf2pic` (or equivalent) to convert each PDF page to an image server-side.
  - Send all page images as separate `image_url` content parts in a single GPT-4o message.
  - Remove the single-page rejection added in Phase 1. Update `LESSONS.md` with any gotcha found during implementation.
- [x] Rate limiting on `POST /api/facturas/upload`
  - Use `express-rate-limit` with a per-user key (`req.user.id`).
  - Limit: 10 requests / 60 seconds (adjust via env var `UPLOAD_RATE_LIMIT`). Return 429 on exceeded limit.
- [x] Smoke test for multi-page & rate limit
  - File: `scripts/smoke/multipage-ratelimit.js`. Fixture: a 2-page PDF under `scripts/smoke/fixtures/`. Assert extraction returns data. Assert 11th upload within 60 s returns 429.

**Block 2.4 closes with**: `git push origin dev-backend`. **End of Phase 2.** Open a PR from `dev-backend` to `main` summarising the phase.

## Phase 3

Pre-requisite: Phase 2 merged to `main`.

### Block 3.1 — Dashboard AI summary endpoint

- [ ] Add `ai_summary_cache` table to schema
  - File: `src/db/schema.sql`. Columns: `user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE`, `narrative TEXT NOT NULL`, `generated_at TEXT NOT NULL`.
  - Migration: add to `additiveMigrations` in both `src/db/init.js` and `src/db/database.js` (see LESSONS.md — SQLite `ALTER TABLE` quirk). Use `CREATE TABLE IF NOT EXISTS` for the new table.

- [ ] Implement `GET /api/analytics/ai-summary`
  - File: `src/routes/analytics.js`.
  - If the user has no facturas, return `{ summary: null }`.
  - Check `ai_summary_cache` for an entry with `user_id = req.user.id`. If one exists and `generated_at` is within 24 hours, return it immediately (cache hit — no Azure call).
  - Otherwise: fetch `summary`, `monthly` (last 3 months), and `clients` (top 3) from `metrics.js`. Build a GPT-4o prompt that includes these numbers and requests a financial narrative ≤ 3 sentences in Spanish covering: total income/expense health, outstanding VAT, and main revenue concentration. Store the result in `ai_summary_cache` (upsert). Return `{ summary: { narrative, generated_at } }`.
  - Errors: 502 on Azure failure (do not cache a failed result).

- [ ] Wire `api.getAiSummary()` in the frontend
  - File: `frontend/src/services/api.ts`
  - Remove the TODO comment. Call `GET /api/analytics/ai-summary`. Return the `data.summary` value (can be `null`).

- [ ] Smoke test for AI summary
  - File: `scripts/smoke/ai-summary.js`.
  - Seed a user with facturas. Call the endpoint; assert non-empty `narrative` string and valid ISO `generated_at`. Call again immediately; assert same `generated_at` (cache hit). Delete all facturas for the user; call the endpoint; assert `summary` is `null`.

**Block 3.1 closes with**: `git push origin dev-backend`. **End of Phase 3.** Open a PR from `dev-backend` to `main` summarising the phase.

---

### Phase 4 — Stretch (high level)

- Alerts: client dependency thresholds, VAT due-date reminders.
- PDF dashboard export endpoint (optional — may be handled entirely client-side).
- Landing page.
