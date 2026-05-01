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
