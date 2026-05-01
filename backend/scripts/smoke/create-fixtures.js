#!/usr/bin/env node
// Generates synthetic test fixtures for smoke tests.
// Usage: node scripts/smoke/create-fixtures.js

const fs = require('fs');
const path = require('path');

function createSinglePagePdf() {
  const objects = [
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj',
    '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj',
    '3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj + '\n';
  }

  const xrefPos = pdf.length;
  const count = objects.length + 1;

  pdf += 'xref\n';
  pdf += `0 ${count}\n`;
  pdf += '0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<</Size ${count}/Root 1 0 R>>\n`;
  pdf += `startxref\n${xrefPos}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

const dir = path.join(__dirname, 'fixtures');
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'sample.pdf'), createSinglePagePdf());
console.log('Fixtures created in', dir);
