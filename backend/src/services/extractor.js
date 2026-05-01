// Invoice data extraction from PDF using Azure AI Foundry (GPT-4o vision).
// The caller is responsible for deleting the PDF after this function returns
// (success or error). This function never deletes the file.

const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const REQUIRED_FIELDS = [
  'numero', 'fecha', 'emisor', 'receptor', 'concepto',
  'base_imponible', 'iva_porcentaje', 'iva_cantidad',
  'irpf_porcentaje', 'irpf_cantidad', 'total', 'moneda', 'tipo',
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONEDA_RE = /^[A-Z]{3}$/;

// Counts /Type /Page entries in the raw PDF bytes.
// This is a best-effort heuristic sufficient for Phase 1 single-page enforcement.
function countPdfPages(buf) {
  const text = buf.toString('latin1');
  const matches = text.match(/\/Type\s*\/Page(?!s)/g);
  return matches ? matches.length : 1;
}

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

const SYSTEM_PROMPT = `You are a Spanish invoice data extractor. Extract data from the invoice PDF and return ONLY a JSON object with these exact fields:
{
  "numero": "<invoice number string>",
  "fecha": "<date in YYYY-MM-DD format>",
  "emisor": "<issuer full name>",
  "receptor": "<recipient full name>",
  "concepto": "<description of goods or services>",
  "base_imponible": <taxable base amount, number>,
  "iva_porcentaje": <VAT rate, e.g. 21, number>,
  "iva_cantidad": <VAT amount, number>,
  "irpf_porcentaje": <IRPF retention rate, 0 if not present, number, always positive>,
  "irpf_cantidad": <IRPF retention amount, 0 if not present, number, always positive>,
  "total": <total = base_imponible + iva_cantidad - irpf_cantidad, number>,
  "moneda": "<3-letter ISO currency code, typically EUR>",
  "tipo": "<ingreso if this is a sales invoice issued by the emitter, gasto if it is a purchase invoice received by the user>"
}
All monetary values are numbers with up to 2 decimal places. Return only the JSON, no markdown, no explanation.`;

function callAzure(base64Pdf) {
  const endpoint = (process.env.AZURE_AI_ENDPOINT || '').replace(/\/$/, '');
  const deployment = process.env.AZURE_AI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_AI_API_VERSION;
  const apiKey = process.env.AZURE_AI_API_KEY;

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  const body = JSON.stringify({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:application/pdf;base64,${base64Pdf}` },
          },
          { type: 'text', text: 'Extract the invoice data from this PDF.' },
        ],
      },
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

  const pageCount = countPdfPages(pdfBuffer);
  if (pageCount > 1) {
    throw new Error(
      `Multi-page PDFs are not supported (detected ${pageCount} pages). ` +
      'Please upload a single-page PDF.'
    );
  }

  const base64Pdf = pdfBuffer.toString('base64');
  const { status, body } = await callAzure(base64Pdf);

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
