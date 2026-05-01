// Generates a short fiscal narrative for a factura using Azure AI Foundry (GPT-4o).
// Returns a plain string of at most 3 sentences in Spanish.

const SYSTEM_PROMPT =
  'Eres un asistente fiscal. Escribe un resumen financiero breve (máximo 3 frases) ' +
  'en español sobre el impacto fiscal de la factura que se te proporciona. ' +
  'Sé conciso y menciona los importes clave (base imponible, IVA, IRPF si aplica, total).';

function buildUserMessage(factura) {
  const lines = [
    `Número: ${factura.numero}`,
    `Fecha: ${factura.fecha}`,
    `Emisor: ${factura.emisor}`,
    `Receptor: ${factura.receptor}`,
    `Concepto: ${factura.concepto}`,
    `Base imponible: ${factura.base_imponible} ${factura.moneda}`,
    `IVA (${factura.iva_porcentaje}%): ${factura.iva_cantidad} ${factura.moneda}`,
  ];
  if (factura.irpf_porcentaje > 0) {
    lines.push(`IRPF (${factura.irpf_porcentaje}%): -${factura.irpf_cantidad} ${factura.moneda}`);
  }
  lines.push(`Total: ${factura.total} ${factura.moneda}`);
  lines.push(`Tipo: ${factura.tipo === 'ingreso' ? 'ingreso (factura emitida)' : 'gasto (factura recibida)'}`);
  return lines.join('\n');
}

async function generateSummary(factura) {
  const endpoint = (process.env.AZURE_AI_ENDPOINT || '').replace(/\/$/, '');
  const deployment = process.env.AZURE_AI_DEPLOYMENT;
  const apiVersion = process.env.AZURE_AI_API_VERSION;
  const apiKey = process.env.AZURE_AI_API_KEY;

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: buildUserMessage(factura) },
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });
  } catch (err) {
    const azErr = new Error(`Azure request failed: ${err.message}`);
    azErr.isAzureError = true;
    throw azErr;
  }

  const data = await res.json();

  if (!res.ok) {
    const message = data?.error?.message || JSON.stringify(data).slice(0, 300);
    const azErr = new Error(`Azure AI Foundry error (HTTP ${res.status}): ${message}`);
    azErr.isAzureError = true;
    throw azErr;
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Azure AI Foundry returned an empty summary');

  return content;
}

module.exports = { generateSummary };
