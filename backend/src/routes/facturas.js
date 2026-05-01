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
// Optional query params: tipo, cliente (substring on receptor),
// proveedor (substring on emisor), importe_min.
// 200 → { success: true, data: { facturas: [...] } }
router.get('/', async (req, res, next) => {
  try {
    const { tipo, cliente, proveedor, importe_min: impMin } = req.query;

    if (tipo !== undefined && tipo !== 'ingreso' && tipo !== 'gasto') {
      return fail(res, '"tipo" must be "ingreso" or "gasto"', 400);
    }
    const importe_min = impMin !== undefined ? Number(impMin) : undefined;
    if (importe_min !== undefined && (!Number.isFinite(importe_min) || importe_min < 0)) {
      return fail(res, '"importe_min" must be a non-negative number', 400);
    }

    const conditions = ['user_id = ?'];
    const params = [req.user.id];

    if (tipo)             { conditions.push('tipo = ?');        params.push(tipo); }
    if (cliente)          { conditions.push('receptor LIKE ?'); params.push(`%${cliente}%`); }
    if (proveedor)        { conditions.push('emisor LIKE ?');   params.push(`%${proveedor}%`); }
    if (importe_min >= 0) { conditions.push('total >= ?');      params.push(importe_min); }

    const db = getDb();
    const rows = db
      .prepare(
        `SELECT id, numero, fecha, emisor, receptor, concepto,
                base_imponible, iva_porcentaje, iva_cantidad,
                irpf_porcentaje, irpf_cantidad, total, moneda, tipo, created_at
         FROM facturas
         WHERE ${conditions.join(' AND ')}
         ORDER BY fecha DESC, id DESC`
      )
      .all(...params);

    const facturas = rows.map((r) => ({
      ...r,
      created_at: r.created_at.replace(' ', 'T') + '.000Z',
    }));
    return ok(res, { facturas });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/facturas/:id
// 200 → { success: true, data: { id } }
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return fail(res, 'Not found', 404);
    }
    const db = getDb();
    const result = db
      .prepare('DELETE FROM facturas WHERE id = ? AND user_id = ?')
      .run(id, req.user.id);

    if (result.changes === 0) {
      return fail(res, 'Not found', 404);
    }
    return ok(res, { id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
