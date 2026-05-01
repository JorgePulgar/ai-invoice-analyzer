// Invoice data extraction from PDF using Azure AI Foundry (GPT-4o).
// The caller is responsible for deleting the PDF after this function returns
// (success or error). This function never deletes the file.
//
// Implementation note: Azure AI Foundry rejects data:application/pdf image URLs
// (only image/* MIME types accepted). We therefore extract the text layer from
// the PDF with pdfjs-dist (dynamic import, ESM) and send it as a plain text
// user message. See docs/LESSONS.md for the full incident record.

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

async function extractPdfText(buffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const workerPath = path.resolve(__dirname, '../../node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'file:///' + workerPath.split('\\').join('/');

  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  const pageTexts = [];
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pageTexts.push(content.items.map(item => item.str).join(' '));
  }

  return { numPages, text: pageTexts.join('\n') };
}

const REQUIRED_FIELDS = [
  'numero', 'fecha', 'emisor', 'receptor', 'concepto',
  'base_imponible', 'iva_porcentaje', 'iva_cantidad',
  'irpf_porcentaje', 'irpf_cantidad', 'total', 'moneda', 'tipo',
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONEDA_RE = /^[A-Z]{3}$/;

function validate(data) {
  for (const field of REQUIRED_FIELDS) {
    if (data[field] === null || data[field] === undefined) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  if (!DATE_RE.test(data.fecha)) {
    throw new Error(`Invalid fecha (expected YYYY-MM-DD): "${data.fecha}"`);
  }
  if (!['ingreso', 'gasto'].includes(data.tipo)) {
    throw new Error(`Invalid tipo "${data.tipo}" (must be ingreso or gasto)`);
  }
  if (!MONEDA_RE.test(data.moneda)) {
    throw new Error(`Invalid moneda "${data.moneda}" (expected 3-letter ISO code)`);
  }
  if (data.irpf_porcentaje < 0 || data.irpf_cantidad < 0) {
    throw new Error('irpf_porcentaje and irpf_cantidad must be >= 0');
  }
  const expectedTotal = data.base_imponible + data.iva_cantidad - data.irpf_cantidad;
  if (Math.abs(expectedTotal - data.total) > 0.01) {
    throw new Error(
      `Total mismatch: ${data.base_imponible} + ${data.iva_cantidad} - ${data.irpf_cantidad}` +
      ` = ${expectedTotal.toFixed(2)}, but total = ${data.total}`
    );
  }
}

const SYSTEM_PROMPT = `You are a Spanish invoice data extractor. Extract data from the invoice text and return ONLY a JSON object with these exact fields:
{
  "numero": "<invoice number string>",
  "fecha": "<date in YYYY-MM-DD format>",
  "emisor": "<issuer full name>",
  "receptor": "<recipient full name>",
  "concepto": "<description of goods or services>",
  "base_imponible": <taxable base amount, number>,
  "iva_porcentaje": <VAT rate e.g. 21, number>,
  "iva_cantidad": <VAT amount, number>,
  "irpf_porcentaje": <IRPF retention rate 0 if not present, always positive, number>,
  "irpf_cantidad": <IRPF retention amount 0 if not present, always positive, number>,
  "total": <total = base_imponible + iva_cantidad - irpf_cantidad, number>,
  "moneda": "<3-letter ISO currency code, typically EUR>",
  "tipo": "<ingreso if this is a sales invoice issued by the emitter, gasto if it is a purchase invoice received by the user>"
}
All monetary values are numbers with up to 2 decimal places. Return only the JSON, no markdown, no explanation.`;

function callAzure(invoiceText) {
  const endpoint = (process.env.AZURE_AI_ENDPOINT || '').replace(/\/$/, '');
  const deployment = process.env.AZURE_AI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_AI_API_VERSION;
  const apiKey = process.env.AZURE_AI_API_KEY;

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const body = JSON.stringify({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: invoiceText },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1024,
  });

  const parsedUrl = new URL(url);
  const lib = parsedUrl.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'api-key': apiKey,
      },
    };

    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          reject(new Error(`Azure response is not valid JSON: ${raw.slice(0, 200)}`));
        }
      });
    });

    req.on('error', (err) => {
      const azErr = new Error(`Azure request failed: ${err.message}`);
      azErr.isAzureError = true;
      reject(azErr);
    });

    req.write(body);
    req.end();
  });
}

async function extractFromPdf(pdfPath) {
  const pdfBuffer = fs.readFileSync(pdfPath);

  let parsed;
  try {
    parsed = await extractPdfText(pdfBuffer);
  } catch (err) {
    throw new Error(`Failed to parse PDF: ${err.message}`);
  }

  if (parsed.numPages > 1) {
    throw new Error(
      `Multi-page PDFs are not supported (${parsed.numPages} pages). ` +
      'Please upload a single-page PDF.'
    );
  }

  const invoiceText = parsed.text.trim();
  if (!invoiceText) {
    throw new Error('PDF contains no extractable text. Scanned PDFs are not supported in Phase 1.');
  }

  const { status, body } = await callAzure(invoiceText);

  if (status !== 200) {
    const message = body?.error?.message || JSON.stringify(body).slice(0, 300);
    const err = new Error(`Azure AI Foundry error (HTTP ${status}): ${message}`);
    err.isAzureError = true;
    throw err;
  }

  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Azure AI Foundry returned an empty response');
  }

  let extracted;
  try {
    extracted = JSON.parse(content);
  } catch {
    throw new Error(`Extraction result is not valid JSON: ${content.slice(0, 200)}`);
  }

  validate(extracted);
  return extracted;
}

module.exports = { extractFromPdf };
