// Financial metrics computed from facturas in the DB.
// All monetary return values are rounded to 2 decimal places.

function round2(n) {
  return Math.round(n * 100) / 100;
}

// periodo strategy: actual MIN/MAX fecha from user data; falls back to current
// fiscal year when there are no facturas.
function getSummary(db, userId) {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN tipo='ingreso' THEN total       ELSE 0 END), 0) AS ingresos_totales,
         COALESCE(SUM(CASE WHEN tipo='gasto'   THEN total       ELSE 0 END), 0) AS gastos_totales,
         COALESCE(SUM(CASE WHEN tipo='ingreso' THEN iva_cantidad  ELSE 0 END), 0) AS iva_repercutido,
         COALESCE(SUM(CASE WHEN tipo='gasto'   THEN iva_cantidad  ELSE 0 END), 0) AS iva_soportado,
         COALESCE(SUM(CASE WHEN tipo='ingreso' THEN irpf_cantidad ELSE 0 END), 0) AS irpf_retenido,
         COUNT(*) AS num_facturas,
         COUNT(DISTINCT CASE WHEN tipo='ingreso' THEN receptor END) AS num_clientes,
         COALESCE(SUM(CASE WHEN tipo='ingreso' THEN 1 ELSE 0 END), 0) AS num_ingresos,
         MIN(fecha) AS fecha_desde,
         MAX(fecha) AS fecha_hasta
       FROM facturas
       WHERE user_id = ?`
    )
    .get(userId);

  const year = new Date().getFullYear();
  const desde = row.fecha_desde || `${year}-01-01`;
  const hasta = row.fecha_hasta || `${year}-12-31`;

  const ingresos_totales = round2(row.ingresos_totales);
  const gastos_totales   = round2(row.gastos_totales);
  const iva_repercutido  = round2(row.iva_repercutido);
  const iva_soportado    = round2(row.iva_soportado);

  return {
    ingresos_totales,
    gastos_totales,
    beneficio_neto:  round2(ingresos_totales - gastos_totales),
    iva_repercutido,
    iva_soportado,
    iva_a_pagar:     round2(iva_repercutido - iva_soportado),
    irpf_retenido:   round2(row.irpf_retenido),
    num_facturas:    row.num_facturas,
    num_clientes:    row.num_clientes,
    ticket_medio:    row.num_ingresos > 0 ? round2(ingresos_totales / row.num_ingresos) : 0,
    moneda:          'EUR',
    periodo:         { desde, hasta },
  };
}

// Returns last 12 months (including current) with ingresos + gastos per month.
// Months with no data appear as { mes, ingresos: 0, gastos: 0 }.
function getMonthly(db, userId) {
  const months = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const rows = db
    .prepare(
      `SELECT
         strftime('%Y-%m', fecha) AS mes,
         SUM(CASE WHEN tipo='ingreso' THEN total ELSE 0 END) AS ingresos,
         SUM(CASE WHEN tipo='gasto'   THEN total ELSE 0 END) AS gastos
       FROM facturas
       WHERE user_id = ?
         AND strftime('%Y-%m', fecha) >= ?
       GROUP BY mes
       ORDER BY mes`
    )
    .all(userId, months[0]);

  const byMes = Object.fromEntries(rows.map((r) => [r.mes, r]));

  return months.map((mes) => ({
    mes,
    ingresos: round2(byMes[mes]?.ingresos ?? 0),
    gastos:   round2(byMes[mes]?.gastos   ?? 0),
  }));
}

// Top clients by total amount invoiced (income only), descending.
function getTopClients(db, userId, limit = 10) {
  return db
    .prepare(
      `SELECT
         receptor AS cliente,
         SUM(total) AS facturado,
         COUNT(*) AS num_facturas
       FROM facturas
       WHERE user_id = ? AND tipo = 'ingreso'
       GROUP BY receptor
       ORDER BY facturado DESC
       LIMIT ?`
    )
    .all(userId, limit)
    .map((r) => ({ ...r, facturado: round2(r.facturado) }));
}

// VAT breakdown for the 4 quarters of the current calendar year.
// Empty quarters appear with zero values.
function getVatBreakdown(db, userId) {
  const anio = new Date().getFullYear();

  const rows = db
    .prepare(
      `SELECT
         CASE
           WHEN CAST(strftime('%m', fecha) AS INTEGER) BETWEEN 1 AND 3 THEN 'T1'
           WHEN CAST(strftime('%m', fecha) AS INTEGER) BETWEEN 4 AND 6 THEN 'T2'
           WHEN CAST(strftime('%m', fecha) AS INTEGER) BETWEEN 7 AND 9 THEN 'T3'
           ELSE 'T4'
         END AS trimestre,
         SUM(CASE WHEN tipo='ingreso' THEN iva_cantidad ELSE 0 END) AS iva_repercutido,
         SUM(CASE WHEN tipo='gasto'   THEN iva_cantidad ELSE 0 END) AS iva_soportado
       FROM facturas
       WHERE user_id = ? AND strftime('%Y', fecha) = ?
       GROUP BY trimestre`
    )
    .all(userId, String(anio));

  const byQ = Object.fromEntries(rows.map((r) => [r.trimestre, r]));

  return ['T1', 'T2', 'T3', 'T4'].map((trimestre) => {
    const rep = round2(byQ[trimestre]?.iva_repercutido ?? 0);
    const sop = round2(byQ[trimestre]?.iva_soportado   ?? 0);
    return {
      trimestre,
      anio,
      iva_repercutido: rep,
      iva_soportado:   sop,
      iva_a_pagar:     round2(rep - sop),
    };
  });
}

module.exports = { getSummary, getMonthly, getTopClients, getVatBreakdown };
