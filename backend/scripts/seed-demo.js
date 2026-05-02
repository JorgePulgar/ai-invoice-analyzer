'use strict';
require('dotenv').config();

const bcrypt = require('bcrypt');
const { getDb } = require('../src/db/database');

const DEMO_EMAIL = 'demo@invoice-insights.com';
const DEMO_PASSWORD = 'demo1234';
const DEMO_EMISOR = 'Consultoría Demo SL';

// Ingreso invoices — demo user bills these clients.
// total = base_imponible + iva_cantidad - irpf_cantidad
const INGRESOS = [
  { numero: 'INV-2025-001', fecha: '2025-01-15', receptor: 'Inditex SA',           concepto: 'Consultoría estratégica enero 2025',         base: 2000, iva_pct: 21, irpf_pct: 15 },
  { numero: 'INV-2025-002', fecha: '2025-03-10', receptor: 'Telefónica España SA',  concepto: 'Consultoría TIC marzo 2025',                  base: 1500, iva_pct: 21, irpf_pct: 15 },
  { numero: 'INV-2025-003', fecha: '2025-05-12', receptor: 'Repsol SA',             concepto: 'Auditoría procesos mayo 2025',                 base: 1600, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2025-004', fecha: '2025-07-08', receptor: 'BBVA SA',               concepto: 'Consultoría gestión riesgos julio 2025',       base: 1900, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2025-005', fecha: '2025-07-22', receptor: 'Banco Santander SA',    concepto: 'Análisis cartera julio 2025',                  base: 1400, iva_pct: 21, irpf_pct: 15 },
  { numero: 'INV-2025-006', fecha: '2025-08-05', receptor: 'Telefónica España SA',  concepto: 'Desarrollo app agosto 2025',                   base: 2200, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2025-007', fecha: '2025-08-19', receptor: 'Inditex SA',            concepto: 'Transformación digital agosto 2025',            base: 1700, iva_pct: 10, irpf_pct:  0 },
  { numero: 'INV-2025-008', fecha: '2025-09-10', receptor: 'Mercadona SA',          concepto: 'Automatización procesos septiembre 2025',       base: 2500, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2025-009', fecha: '2025-09-25', receptor: 'Iberdrola SA',          concepto: 'Consultoría energética septiembre 2025',        base: 1300, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2025-010', fecha: '2025-10-07', receptor: 'Repsol SA',             concepto: 'Auditoría sostenibilidad octubre 2025',         base: 1800, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2025-011', fecha: '2025-10-28', receptor: 'Telefónica España SA',  concepto: 'Mejoras plataforma octubre 2025',               base: 1500, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2025-012', fecha: '2025-11-12', receptor: 'Banco Santander SA',    concepto: 'Consultoría regulatoria noviembre 2025',        base: 1600, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2025-013', fecha: '2025-11-27', receptor: 'Inditex SA',            concepto: 'Transformación digital noviembre 2025',         base: 2000, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2025-014', fecha: '2025-12-09', receptor: 'BBVA SA',               concepto: 'Análisis riesgos diciembre 2025',               base: 1700, iva_pct: 10, irpf_pct:  0 },
  { numero: 'INV-2025-015', fecha: '2025-12-22', receptor: 'Iberdrola SA',          concepto: 'Optimización energética diciembre 2025',        base: 1200, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2026-001', fecha: '2026-01-14', receptor: 'Mercadona SA',          concepto: 'Estrategia digital enero 2026',                 base: 2100, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2026-002', fecha: '2026-01-28', receptor: 'Repsol SA',             concepto: 'Sostenibilidad Q1 enero 2026',                  base: 1400, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2026-003', fecha: '2026-02-11', receptor: 'Telefónica España SA',  concepto: 'Desarrollo plataforma febrero 2026',            base: 1800, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2026-004', fecha: '2026-02-25', receptor: 'BBVA SA',               concepto: 'Consultoría financiera febrero 2026',           base: 1500, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2026-005', fecha: '2026-03-10', receptor: 'Banco Santander SA',    concepto: 'Análisis Q1 marzo 2026',                        base: 1900, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2026-006', fecha: '2026-03-24', receptor: 'Inditex SA',            concepto: 'E-commerce consultoría marzo 2026',             base: 1600, iva_pct: 10, irpf_pct:  0 },
  { numero: 'INV-2026-007', fecha: '2026-04-08', receptor: 'Iberdrola SA',          concepto: 'Auditoría energética abril 2026',               base: 1100, iva_pct: 21, irpf_pct:  0 },
  { numero: 'INV-2026-008', fecha: '2026-04-22', receptor: 'Repsol SA',             concepto: 'Estrategia sostenible abril 2026',              base: 1300, iva_pct: 21, irpf_pct:  0 },
];

// Gasto invoices — suppliers billing the demo user.
// 4 distinct suppliers, keywords: hosting, marketing, transporte, material oficina.
const GASTOS = [
  { numero: 'GASTO-2025-001', fecha: '2025-07-01', emisor: 'AWS Europe SARL',   concepto: 'Hosting servidor cloud Q3 2025',           base: 1200, iva_pct: 21, irpf_pct: 0 },
  { numero: 'GASTO-2025-002', fecha: '2025-08-15', emisor: 'Google Ads SL',      concepto: 'Campaña marketing digital Q3 2025',         base: 1000, iva_pct: 21, irpf_pct: 0 },
  { numero: 'GASTO-2025-003', fecha: '2025-09-10', emisor: 'Renfe Operadora',    concepto: 'Transporte comercial septiembre 2025',       base:  300, iva_pct: 10, irpf_pct: 0 },
  { numero: 'GASTO-2025-004', fecha: '2025-10-15', emisor: 'Oficina Total SL',   concepto: 'Material oficina papelería octubre 2025',    base:  500, iva_pct: 21, irpf_pct: 0 },
  { numero: 'GASTO-2025-005', fecha: '2025-11-01', emisor: 'AWS Europe SARL',   concepto: 'Hosting servidor cloud Q4 2025',            base: 1200, iva_pct: 21, irpf_pct: 0 },
  { numero: 'GASTO-2025-006', fecha: '2025-12-05', emisor: 'Google Ads SL',      concepto: 'Campaña marketing Q4 2025',                 base: 1000, iva_pct: 21, irpf_pct: 0 },
  { numero: 'GASTO-2026-001', fecha: '2026-01-02', emisor: 'AWS Europe SARL',   concepto: 'Hosting infraestructura cloud enero 2026',  base: 1200, iva_pct: 21, irpf_pct: 0 },
];

function round2(n) {
  return Math.round(n * 100) / 100;
}

function buildRow(userId, inv, tipo) {
  const iva_cantidad   = round2(inv.base * inv.iva_pct / 100);
  const irpf_cantidad  = round2(inv.base * inv.irpf_pct / 100);
  const total          = round2(inv.base + iva_cantidad - irpf_cantidad);
  const emisor         = tipo === 'ingreso' ? DEMO_EMISOR : inv.emisor;
  const receptor       = tipo === 'ingreso' ? inv.receptor : DEMO_EMISOR;

  return {
    user_id:          userId,
    numero:           inv.numero,
    fecha:            inv.fecha,
    emisor,
    receptor,
    concepto:         inv.concepto,
    base_imponible:   inv.base,
    iva_porcentaje:   inv.iva_pct,
    iva_cantidad,
    irpf_porcentaje:  inv.irpf_pct,
    irpf_cantidad,
    total,
    moneda:           'EUR',
    tipo,
  };
}

function seed() {
  const db = getDb();

  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
  const passwordHash = bcrypt.hashSync(DEMO_PASSWORD, rounds);

  db.prepare(
    'INSERT OR IGNORE INTO users (email, password_hash) VALUES (?, ?)'
  ).run(DEMO_EMAIL, passwordHash);

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO_EMAIL);
  const userId = user.id;

  const insertFactura = db.prepare(`
    INSERT OR IGNORE INTO facturas
      (user_id, numero, fecha, emisor, receptor, concepto,
       base_imponible, iva_porcentaje, iva_cantidad,
       irpf_porcentaje, irpf_cantidad, total, moneda, tipo)
    VALUES
      (@user_id, @numero, @fecha, @emisor, @receptor, @concepto,
       @base_imponible, @iva_porcentaje, @iva_cantidad,
       @irpf_porcentaje, @irpf_cantidad, @total, @moneda, @tipo)
  `);

  let inserted = 0;
  let skipped  = 0;

  const seedAll = db.transaction(() => {
    for (const inv of INGRESOS) {
      const result = insertFactura.run(buildRow(userId, inv, 'ingreso'));
      result.changes ? inserted++ : skipped++;
    }
    for (const inv of GASTOS) {
      const result = insertFactura.run(buildRow(userId, inv, 'gasto'));
      result.changes ? inserted++ : skipped++;
    }
  });

  seedAll();

  const totalRows = db
    .prepare('SELECT COUNT(*) AS n FROM facturas WHERE user_id = ?')
    .get(userId).n;

  console.log(`[seed-demo] user: ${DEMO_EMAIL} (id=${userId})`);
  console.log(`[seed-demo] inserted=${inserted}  skipped(already existed)=${skipped}`);
  console.log(`[seed-demo] total facturas for demo user: ${totalRows}`);
  console.log('[seed-demo] done.');
}

seed();
