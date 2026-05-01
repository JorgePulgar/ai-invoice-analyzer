# Smoke check — Block 1.3 Upload page

Environment: `USE_MOCK = true`, dev server at http://localhost:5173

## Pre-condition

Log in to reach the protected upload page at http://localhost:5173/upload.

## Steps

### Happy path — drag and drop

1. Navigate to http://localhost:5173/upload.
   - Expected: DropZone visible with dashed border and "Seleccionar archivo" button.

2. Drag any PDF file onto the DropZone.
   - Expected: border turns yellow while dragging ("Suelta el archivo aquí" text).
   - On drop: border reverts, "Procesando…" status appears, DropZone is greyed out (disabled).
   - After ~800 ms (mock latency): "Subido correctamente" in green, DropZone re-enabled,
     JSON block appears below showing the extracted factura data.

### Happy path — file picker

3. Click "Seleccionar archivo", choose a PDF from the file dialog.
   - Expected: same flow as step 2 (loading → success → JSON).

### Drag-over visual state

4. Drag a PDF over the DropZone without dropping.
   - Expected: border turns yellow, background has a faint yellow tint.
   - Drag away without dropping: returns to default dashed style.

### Validation — non-PDF file

5. Drag a non-PDF file (e.g. a .txt, .jpg, or .docx) onto the DropZone.
   - Expected: no loading state; inline red error "El archivo debe ser un PDF."
   - DropZone remains enabled.

6. Click "Seleccionar archivo", pick a non-PDF from the file dialog.
   - Expected: same inline error, no API call.

### Validation — oversized file

7. Drag or select a file larger than 10 MB.
   - Expected: inline red error "El archivo supera el límite de 10 MB."
   - No loading state, DropZone remains enabled.

### Multiple uploads

8. After a successful upload, drag another PDF.
   - Expected: previous result clears, "Procesando…" shows again, new result renders.

## Result

All steps passed on: <!-- fill in date and commit sha -->
