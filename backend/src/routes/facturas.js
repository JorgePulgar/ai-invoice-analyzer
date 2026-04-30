const express = require('express');
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { fail } = require('../utils/response');

const router = express.Router();

router.use(authenticate);

// POST /api/facturas/upload  (multipart/form-data, field: "file")
// 201 → { success: true, data: <factura> }
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    return fail(res, 'Not implemented', 501);
  } catch (err) {
    next(err);
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
