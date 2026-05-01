#!/usr/bin/env node
// Generates scripts/smoke/fixtures/sample-2page.pdf using pdf-lib.
// Run once: node scripts/smoke/gen-2page-fixture.js
// Commit the resulting fixture; re-run only when the fixture needs to change.

const path = require('path');
const fs   = require('fs');

async function main() {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  function addText(page, text, x, y, { size = 11, f = font, color = rgb(0,0,0) } = {}) {
    page.drawText(text, { x, y, size, font: f, color });
  }

  // ─── Page 1: invoice header and line items ────────────────────────────────
  const p1 = doc.addPage([595, 842]);

  addText(p1, 'FACTURA',               210, 780, { size: 22, f: bold });
  addText(p1, 'Número:  F-2026-MP-001',  50, 740);
  addText(p1, 'Fecha:   2026-05-01',     50, 720);

  addText(p1, 'EMISOR',  50, 685, { f: bold });
  addText(p1, 'Tech Solutions SL',       50, 665);
  addText(p1, 'NIF: B-12345678',         50, 645);

  addText(p1, 'RECEPTOR',             320, 685, { f: bold });
  addText(p1, 'Inversiones Globales SA', 320, 665);
  addText(p1, 'NIF: A-87654321',         320, 645);

  addText(p1, 'Concepto: Consultoría estratégica Q2 2026', 50, 600);

  addText(p1, 'Descripción',           50, 555, { f: bold });
  addText(p1, 'Importe',              450, 555, { f: bold });
  p1.drawLine({ start: { x: 50, y: 548 }, end: { x: 545, y: 548 }, thickness: 0.5 });

  addText(p1, 'Fase 1 — Análisis',     50, 530);
  addText(p1, '1.200,00 EUR',         430, 530);
  addText(p1, 'Fase 2 — Implementación', 50, 510);
  addText(p1, '1.800,00 EUR',         430, 510);

  addText(p1, '(continúa en página 2)', 50, 460, { size: 9, color: rgb(0.5, 0.5, 0.5) });

  // ─── Page 2: tax summary and totals ───────────────────────────────────────
  const p2 = doc.addPage([595, 842]);

  addText(p2, 'FACTURA F-2026-MP-001 — Página 2 de 2', 50, 800, { size: 10, color: rgb(0.4,0.4,0.4) });

  addText(p2, 'Resumen fiscal',  50, 750, { size: 14, f: bold });

  addText(p2, 'Base imponible:',      50, 700);
  addText(p2, '3.000,00 EUR',        400, 700);

  addText(p2, 'IVA (21%):',           50, 675);
  addText(p2, '630,00 EUR',          400, 675);

  addText(p2, 'IRPF (15%):',          50, 650);
  addText(p2, '-450,00 EUR',         400, 650);

  p2.drawLine({ start: { x: 350, y: 638 }, end: { x: 545, y: 638 }, thickness: 0.5 });

  addText(p2, 'TOTAL A PAGAR:',       50, 620, { f: bold });
  addText(p2, '3.180,00 EUR',        400, 620, { f: bold });

  addText(p2, 'Moneda: EUR',          50, 580);
  addText(p2, 'Tipo: ingreso (factura emitida por Tech Solutions SL)', 50, 555);

  addText(p2, 'Condiciones de pago: transferencia bancaria en 30 días.', 50, 510, { size: 9 });

  // ─── write output ─────────────────────────────────────────────────────────
  const outPath = path.join(__dirname, 'fixtures', 'sample-2page.pdf');
  fs.writeFileSync(outPath, await doc.save());
  console.log(`Written: ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
