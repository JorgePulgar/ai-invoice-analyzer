// Returns the date string if valid YYYY-MM-DD, false if present but invalid, null if absent.
function parseDateParam(value) {
  if (value === undefined || value === null) return null;
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(String(value))) return false;
  return String(value);
}

const FACTURA_REQUIRED = [
  'numero', 'fecha', 'emisor', 'receptor', 'concepto',
  'base_imponible', 'iva_porcentaje', 'iva_cantidad',
  'irpf_porcentaje', 'irpf_cantidad', 'total', 'moneda', 'tipo',
];

// Throws with a descriptive message if any contract validation rule fails.
// Mirrors the extractor's validate() so confirm and upload use the same rules.
function validateFacturaFields(data) {
  for (const field of FACTURA_REQUIRED) {
    if (data[field] === null || data[field] === undefined) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) {
    throw new Error(`Invalid fecha (expected YYYY-MM-DD): "${data.fecha}"`);
  }
  if (!['ingreso', 'gasto'].includes(data.tipo)) {
    throw new Error(`Invalid tipo "${data.tipo}" (must be ingreso or gasto)`);
  }
  if (!/^[A-Z]{3}$/.test(String(data.moneda))) {
    throw new Error(`Invalid moneda "${data.moneda}" (expected 3-letter ISO code)`);
  }
  if (Number(data.irpf_porcentaje) < 0 || Number(data.irpf_cantidad) < 0) {
    throw new Error('irpf_porcentaje and irpf_cantidad must be >= 0');
  }
  const expected = Number(data.base_imponible) + Number(data.iva_cantidad) - Number(data.irpf_cantidad);
  if (Math.abs(expected - Number(data.total)) > 0.01) {
    throw new Error(
      `Total mismatch: ${data.base_imponible} + ${data.iva_cantidad} - ${data.irpf_cantidad}` +
      ` = ${expected.toFixed(2)}, but total = ${data.total}`
    );
  }
}

module.exports = { parseDateParam, validateFacturaFields };
