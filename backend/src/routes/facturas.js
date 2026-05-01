const express = require('express');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { extractFromPdf } = require('../services/extractor');
const { getDb } = require('../db/database');
const { ok, fail } = require('../utils/response');

const router = express.Router();

router.use(authenticate);

// Wraps multer so its errors are mapped to the correct HTTP status codes
// before reaching the generic error handler.
function multerUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    // Delete any partially-written file so the no-PDF-on-disk invariant holds.
    if (req.file) fs.unlink(req.file.path, () => {});
    if (err.code === 'LIMIT_FILE_SIZE') return fail(res, 'File too large', 413);
    if (err.message === 'Only PDF files are accepted') return fail(res, 'Only PDF files are accepted', 415);
    return next(err);
  });
}

// POST /api/facturas/upload  (multipart/form-data, field: "file")
// 201 → { success: true, data: <factura> }
router.post('/upload', multerUpload, async (req, res, next) => {
  if (!req.file) return fail(res, 'No file uploaded', 400);

  const filePath = req.file.path;
  try {
    let extracted;
    try {
      extracted = await extractFromPdf(filePath);
    } catch (err) {
      if (err.isAzureError) return fail(res, err.message, 502);
      return fail(res, err.message, 400);
    }

    const db = getDb();
    let row;
    try {
      row = db
        .prepare(
          `INSERT INTO facturas
             (user_id, numero, fecha, emisor, receptor, concepto,
              base_imponible, iva_porcentaje, iva_cantidad,
              irpf_porcentaje, irpf_cantidad, total, moneda, tipo)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
           RETURNING *`
        )
        .get(
          req.user.id, extracted.numero, extracted.fecha, extracted.emisor,
          extracted.receptor, extracted.concepto, extracted.base_imponible,
          extracted.iva_porcentaje, extracted.iva_cantidad, extracted.irpf_porcentaje,
          extracted.irpf_cantidad, extracted.total, extracted.moneda, extracted.tipo
        );
    } catch (dbErr) {
      if (dbErr.message.includes('UNIQUE constraint failed')) {
        return fail(res, 'Invoice number already exists for this account', 409);
      }
      throw dbErr;
    }

    const { user_id: _uid, updated_at: _upd, ...factura } = row;
    factura.created_at = factura.created_at.replace(' ', 'T') + '.000Z';
    return ok(res, factura, 201);
  } catch (err) {
    next(err);
  } finally {
    fs.unlink(filePath, () => {});
  }
});

// GET /api/facturas
// 200 → { success: true, data: { facturas: [...] } }
router.get('/', async (req, res, next) => {
  try {
    return fail(res, 'Not implemented', 501);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/facturas/:id
// 200 → { success: true, data: { id } }
router.delete('/:id', async (req, res, next) => {
  try {
    return fail(res, 'Not implemented', 501);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
