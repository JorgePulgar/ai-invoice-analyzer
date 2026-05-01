#!/usr/bin/env node
// Generates synthetic test fixtures for smoke tests.
// Uses pdf-lib (dev dependency) to produce a standards-compliant PDF.
// Usage: node scripts/smoke/create-fixtures.js

const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

async function createInvoicePdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);

  const lines = [
    'FACTURA',
    '',
    'Numero de factura: F-SMOKE-001',
    'Fecha: 2026-01-15',
    '',
    'EMISOR:',
    'Test Empresa Servicios SL',
    'CIF: B12345678',
    'Calle Mayor 1, 28001 Madrid',
    '',
    'RECEPTOR:',
    'Cliente Test Sistemas SL',
    'CIF: A87654321',
    'Avenida de la Paz 5, 08001 Barcelona',
    '',
    'CONCEPTO: Servicios de consultoria - enero 2026',
    '',
    'Base Imponible:          1.000,00 EUR',
    'IVA 21%:                   210,00 EUR',
    'Retencion IRPF 15%:        150,00 EUR',
    'TOTAL A PAGAR:           1.060,00 EUR',
  ];

  let y = 742;
  for (const line of lines) {
    if (line) {
      page.drawText(line, { x: 50, y, font, size: 11, color: rgb(0, 0, 0) });
    }
    y -= 15;
  }

  // pdf-parse bundles pdfjs v1.10 which cannot decompress modern flate streams;
  // saving without object streams keeps it compatible.
  return doc.save({ useObjectStreams: false });
}

async function run() {
  const dir = path.join(__dirname, 'fixtures');
  fs.mkdirSync(dir, { recursive: true });
  const pdfBytes = await createInvoicePdf();
  const dest = path.join(dir, 'sample.pdf');
  fs.writeFileSync(dest, pdfBytes);
  console.log(`Created ${dest} (${pdfBytes.length} bytes)`);
}

run().catch((err) => { console.error(err); process.exit(1); });
