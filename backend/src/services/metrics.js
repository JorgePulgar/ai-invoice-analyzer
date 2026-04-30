// Financial metrics computed from facturas in the DB.
// One function per analytics endpoint.

function getSummary(db, userId) {
  // TODO: top-level KPIs (total income, total expenses, net profit,
  // VAT collected, IRPF withheld, invoice count, etc.)
  throw new Error('Not implemented');
}

function getMonthly(db, userId) {
  // TODO: array of { mes: 'YYYY-MM', ingresos, gastos } for the last 12 months
  throw new Error('Not implemented');
}

function getTopClients(db, userId, limit = 10) {
  // TODO: top clients by invoiced amount (income only, tipo='ingreso')
  throw new Error('Not implemented');
}

function getVatBreakdown(db, userId) {
  // TODO: VAT breakdown per quarter (T1..T4) of the current year:
  // iva_repercutido (income), iva_soportado (expenses), iva_a_pagar
  throw new Error('Not implemented');
}

module.exports = { getSummary, getMonthly, getTopClients, getVatBreakdown };
