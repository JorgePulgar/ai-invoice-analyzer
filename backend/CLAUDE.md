# CLAUDE.md — Backend

@../docs/api-contract.md

The contract above is auto-imported. Read the root `CLAUDE.md` first for cross-cutting rules (branch flow, language, never/always, per-task flow). Read `TASKS.md` in this directory for the work queue.

## Stack

- Node.js ≥ 20
- Express
- `better-sqlite3` — synchronous, no ORM, prepared statements
- `bcrypt` — rounds from `BCRYPT_ROUNDS` env var (≥ 12)
- `jsonwebtoken`
- `multer` — single-file uploads, 10 MB limit, `application/pdf` only
- Azure AI Foundry GPT-4o (vision) for PDF extraction

## Folder layout

```
backend/
├── src/
│   ├── routes/        — auth, facturas, analytics, health
│   ├── services/      — extractor (Azure), metrics (analytics SQL)
│   ├── middleware/    — auth (JWT verify), upload (multer), errorHandler
│   ├── utils/         — response helpers (ok, fail)
│   ├── db/            — schema.sql, database.js (singleton), init.js
│   └── app.js
├── uploads/           — temporary; PDFs deleted immediately after extraction
└── data/              — SQLite database file (gitignored)
```

## Conventions

### HTTP responses

Always go through `utils/response.js`:

```js
const { ok, fail } = require('../utils/response');

// success
return ok(res, { user: { id, email } }, 201);

// error
return fail(res, 'Email already registered', 409);
```

Do not call `res.json(...)` directly anywhere. Do not invent ad-hoc response shapes.

### Async route handlers

Wrap async logic so errors propagate to the error middleware:

```js
router.post('/x', async (req, res, next) => {
  try {
    // ...
  } catch (err) {
    next(err);
  }
});
```

The error handler (`middleware/errorHandler.js`) maps the error to a `fail`-shaped response. 5xx errors are logged.

### Database access

- **Always prepared statements**: `db.prepare('SELECT ... WHERE id = ?').get(id)`.
- Never string-concatenate user input into SQL.
- `PRAGMA foreign_keys = ON` is set in `database.js`. Trust it.
- Use transactions for multi-statement writes: `db.transaction(() => { ... })()`.
- Schema lives in `src/db/schema.sql`. To re-apply: `npm run init-db`. This is a no-op on existing tables (uses `IF NOT EXISTS`); for destructive resets in dev, delete `data/invoice-insights.db` first.

### Authentication

- `bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS))` for hashing.
- JWT payload: `{ id, email }`. Sign with `process.env.JWT_SECRET`, expiry from `JWT_EXPIRES_IN`.
- `middleware/auth.js` is mounted on every protected route. It reads `Authorization: Bearer <token>`, verifies, sets `req.user = { id, email }`, then `next()`.
- Login error message and "user not found" must be identical (no user enumeration).

### Validation

Validate inputs at the route boundary. Reject early with `fail(res, '...', 400)`. No external validation library — keep validation minimal, explicit, and inline. If validation in a route grows past ~10 lines, extract a helper into `src/utils/validate.js`.

## Azure AI Foundry — extractor notes

- Endpoint URL shape:
  `${AZURE_AI_ENDPOINT}/openai/deployments/${AZURE_AI_DEPLOYMENT}/chat/completions?api-version=${AZURE_AI_API_VERSION}`
- Auth header: `api-key: ${AZURE_AI_API_KEY}` (NOT `Authorization: Bearer`).
- For Phase 1, send the PDF as a base64 data URL inside an `image_url` content part. GPT-4o vision accepts single-page PDFs this way. **Reject multi-page PDFs with a clear error in Phase 1**; multi-page support (rendering pages to images server-side) is Phase 2+.
- Use `response_format: { type: "json_object" }` and a system prompt that pins the extractor output JSON shape from `docs/api-contract.md` (the "Extractor output" section).
- The extractor MUST validate the parsed JSON before returning. Validation rules are in the api-contract. Throw with a clear message on failure; do not return partial data.
- The extractor does NOT delete the PDF. The upload route deletes it in a `finally` block.
- If `AZURE_AI_API_VERSION` becomes deprecated, web-fetch the latest Azure docs and update; do not silently switch to a different API surface.

## Commands

```bash
npm install
npm run init-db       # apply schema (creates data/ if missing)
npm run dev           # nodemon on src/
npm start             # production start
```

## Environment variables

See `.env.example`. Critical:

- `JWT_SECRET` — ≥ 32 random bytes. Generate: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
- `AZURE_AI_ENDPOINT`, `AZURE_AI_API_KEY`, `AZURE_AI_DEPLOYMENT`, `AZURE_AI_API_VERSION` — all required for the extractor to work. Without these, `POST /api/facturas/upload` will fail at runtime.
- `BCRYPT_ROUNDS` — ≥ 12.
- `MAX_FILE_SIZE_MB` — multer limit (default 10).
- `CORS_ORIGIN` — comma-separated list of allowed origins, or `*` for dev.

## When working on the extractor

Additionally read:
- `src/services/extractor.js` itself.
- The "Extractor output" section in `docs/api-contract.md` (already imported).

Smoke-test artefact required: a script under `scripts/smoke/extractor.js` that runs the extractor against a sample PDF and prints the extracted JSON. Sample PDFs go under `scripts/smoke/fixtures/`. Synthetic samples may be committed; PDFs containing real personal data must NOT be committed (add to `.gitignore` if needed).

## When the extractor or Azure call fails repeatedly

If the same error pattern appears more than once, write an entry in `docs/LESSONS.md` (create the file if it does not exist). The entry must include: what the error looked like, root cause, the fix applied, and what to watch for next time. This prevents the next session from rediscovering the same gotcha.
