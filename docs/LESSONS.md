# LESSONS — non-obvious gotchas and their fixes

## Azure AI Foundry rejects `data:application/pdf` in `image_url`

**Error seen:**
```
Azure AI Foundry error (HTTP 400): Invalid image URL: 'messages[1].content[0].image_url.url'.
Expected a base64-encoded data URL with an image MIME type (e.g. 'data:image/png;base64,...'),
but got unsupported MIME type 'application/pdf'.
```

**Root cause:**  
The original CLAUDE.md spec stated "GPT-4o vision accepts single-page PDFs via a `data:application/pdf;base64,...` image URL." This is true for the OpenAI API directly, but the Azure AI Foundry endpoint (`*.services.ai.azure.com`) validates the MIME type and rejects anything that is not an image type (`image/png`, `image/jpeg`, etc.).

**Fix applied:**  
Replaced the image_url approach with PDF text extraction using `pdf-parse`. The extractor now:
1. Parses the PDF with `pdf-parse` to get the page count and text content.
2. Rejects multi-page PDFs (same enforcement as before, now uses `parsed.numpages` instead of a regex heuristic).
3. Sends the extracted text as a plain `user` message to GPT-4o (no `image_url`).

This works for all digitally-generated invoices (which have an embedded text layer). Scanned invoices without a text layer will fail with a clear error message.

**What to watch for next time:**  
- Phase 2 scanned-invoice support will need server-side PDF→image rendering (e.g. `pdfjs-dist` + `canvas` or Ghostscript) to produce a proper `data:image/png;base64,...` payload.
- If the Azure endpoint is upgraded or changed, re-test the image URL approach — it may eventually be supported.
- `pdf-parse` returns empty text for image-only PDFs; the extractor throws a clear 400 in that case.

---

## Multi-page PDF support: text extraction preferred over image rendering

**Context (Phase 2, Block 2.4):**
The initial spec called for converting each PDF page to a PNG image with `pdf2pic` and sending them as separate `image_url` content parts. This mirrors the approach GPT-4o vision APIs typically use.

**Why we stayed with text extraction instead:**

1. `pdf2pic` requires a system binary (ImageMagick or Ghostscript) that is not available in all deployment environments and cannot be installed via npm alone.
2. Rendering PDFs to images via `pdfjs-dist` + `canvas` requires compiling the `canvas` native module (libcairo, libpango system dependencies) — brittle in CI and on Windows.
3. `pdfjs-dist` (already installed) already extracts text from every page in a loop; removing the single-page guard was the only code change needed.
4. For digitally-generated invoices (the primary target), text extraction is cleaner and more reliable for structured data extraction than OCR over rendered images.

**Fix applied:**
Removed the `numPages > 1` guard. `extractPdfText` now returns all pages joined as `[Página N de M]\n<text>` blocks, which gives GPT-4o clear page-boundary hints without requiring image rendering.

**Watch for next time:**
If scanned (non-text-layer) multi-page PDFs become a requirement, revisit image rendering with a prebuilt canvas package such as `@napi-rs/canvas` (no compilation needed, ships pre-built binaries for all major platforms). That change is isolated to `extractPdfText` in `src/services/extractor.js`.

---

## SQLite `ALTER TABLE ADD COLUMN` has no `IF NOT EXISTS` (SQLite < 3.37)

**Error seen:**
```
SqliteError: duplicate column name: summary
```
Thrown when `db.exec('ALTER TABLE facturas ADD COLUMN summary TEXT')` is called against a DB where the column already exists (e.g., after re-running `npm run init-db` or reconnecting to an already-migrated database).

**Root cause:**  
SQLite versions below 3.37 do not support `ALTER TABLE … ADD COLUMN … IF NOT EXISTS`. `CREATE TABLE IF NOT EXISTS` guards only table creation, not column additions to existing tables.

**Fix applied:**  
Additive column migrations are wrapped in try/catch. The error is swallowed only for `"duplicate column name"`; any other error is re-thrown. The same migration list lives in both `src/db/init.js` (for explicit `npm run init-db` runs) and `src/db/database.js` (applied automatically on every DB open so a plain `npm start` picks up new columns without a manual init step).

**Watch for next time:**  
Every new nullable column added to an existing table needs a matching entry in the `additiveMigrations` arrays in **both** `init.js` and `database.js`.
