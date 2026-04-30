// Invoice data extraction from PDF using Azure AI Foundry (GPT-4o vision).
//
// Output contract (must be honoured):
// {
//   numero, fecha, emisor, receptor, concepto,
//   base_imponible, iva_porcentaje, iva_cantidad,
//   irpf_porcentaje, irpf_cantidad, total, moneda, tipo
// }
//
// Important: the caller must delete the PDF immediately after calling this
// function, regardless of outcome (success or error).

async function extractFromPdf(pdfPath) {
  // TODO: implement
  // 1. Read PDF as base64
  // 2. Call Azure AI Foundry with a structured prompt + image_url (data URI)
  // 3. Parse the response JSON and validate required fields
  // 4. Return the factura object
  throw new Error('Not implemented');
}

module.exports = { extractFromPdf };
