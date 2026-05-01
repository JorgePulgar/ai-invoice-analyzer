# Smoke check — Phase 2 Upload (Block 2.4)

Environment: dev server at http://localhost:5173. Run with `cd frontend && npm run dev`.

Two configurations:

- **A** — Live backend: `USE_MOCK = false` (default). Backend running at `http://localhost:3000`. Phase 1 direct-upload flow must remain unchanged — `extractFactura` throws the sentinel and `UploadPage` falls back transparently to `uploadFactura`.
- **B** — Mock mode: `USE_MOCK = true`. The two-step extract → review → confirm flow runs end-to-end against mock data.

## Pre-condition

Log in (or register) to reach `/upload`.

---

## Configuration A — live backend (Phase 1 fallback path)

1. Set `USE_MOCK = false`. Restart the dev server.
2. Drop a real, single-page PDF invoice into the DropZone.
   - Expected status: "Extracting data…" briefly, then no review form.
   - Expected outcome: `result` panel appears with the extracted JSON and the `TipoBadge` in its header. Status text: "Saved successfully".
   - Expected: invoice persisted (visible on next dashboard load).
   - This is the Phase 1 flow unchanged — `extractFactura` throws the Phase 2 pending sentinel and the page falls back to `uploadFactura` without surfacing the error.

3. Drop a non-PDF file (e.g. a `.txt`).
   - Expected: error "File must be a PDF.", status reset, DropZone re-enabled.

4. Drop a > 10 MB PDF.
   - Expected: error "File exceeds the 10 MB limit.", DropZone re-enabled.

5. Drop a multi-page PDF.
   - Expected: backend rejects with 400; error message rendered inline (multi-page support is Phase 2 backend scope, not frontend).

6. Open DevTools → Network. Drop a valid PDF.
   - Expected: only `POST /api/facturas/upload` request; **no** request named `/api/facturas/extract` or `/api/facturas/confirm`. Confirms the fallback path was taken.

---

## Configuration B — mock mode (two-step review flow)

7. Set `USE_MOCK = true` in `src/services/api.ts`. Restart the dev server.
8. Drop any PDF (mock ignores file content; size + type validation still applies).
   - Expected: status "Extracting data…" for ~800 ms.
   - Expected: review form appears, populated with mock invoice fields:
     - Number F-2026-014, Date 2026-04-22, Issuer "Tu Empresa SL", Recipient "Telefónica Movistar SA", etc.

### Editing fields

9. Modify the **Description** field (e.g. add " — edited").
10. Click **Confirm and save**.
    - Expected: status flips to "Saving…" (~300 ms).
    - Expected: success state — review form replaced by the JSON result panel showing the edited description, plus `TipoBadge` ("Income"). Status: "Saved successfully".

### Total mismatch warning

11. Drop another PDF to re-enter the review flow.
12. Edit **Total** to a value that breaks `total ≈ base + iva − irpf` by more than 0.01.
    - Expected: yellow warning chip below the Total field: "Total does not match: review VAT / withholding tax".
    - Expected: warning is non-blocking — submit still works.

### Validation: required fields

13. Clear the **Number** field, click **Confirm and save**.
    - Expected: red inline error "Required" under the Number field. No submission.

### Validation: invalid date format

14. Edit **Date** input to clear it.
    - Expected: red inline error "Format YYYY-MM-DD" under the Date field on submit.

### Validation: negative withholding tax

15. Set **Withholding Tax %** to `-5`.
    - Expected: red inline error "Withholding tax must be ≥ 0" under the WHT % field.

### Discard

16. Drop a PDF, wait for the review form, click **Discard**.
    - Expected: review form disappears, status returns to idle, DropZone re-enabled, no network requests for confirmation.

### Mock network sanity

17. Open DevTools → Network. Drop a PDF.
    - Expected: a single request to `/mock/data.json` (cache-hit if already loaded), then no further requests until "Confirm and save" — and even then no real network calls (mock confirm is in-memory).

### Revert before pushing

18. Set `USE_MOCK = false`. Restart. Verify Configuration A path still works (step 2).

---

## Result

All steps passed on: <!-- fill in date and commit sha -->
