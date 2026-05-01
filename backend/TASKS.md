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

## Phase 2 — Nice-to-have (high level)

Listed without task-level detail; refined when the phase starts.

- AI summary endpoint: generate a short narrative (≤ 3 sentences) of an upload's financial impact.
- Manual validation flow: persist extracted data to a "draft" table; user confirms/edits before promoting to `facturas`.
- Filters on `/api/analytics/*` and `/api/facturas`: query params for period, client, type.
- Multi-page PDF support in the extractor (render pages to images server-side, send all pages).
- Rate limiting on `/api/facturas/upload` (Azure cost protection).

## Phase 3 — Stretch (high level)

- Alerts: client dependency thresholds, VAT due-date reminders.
- PDF dashboard export.
- Landing page.
