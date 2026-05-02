// Generates a GPT-4o financial narrative for the user's overall dashboard.
// Returns a plain string of at most 3 sentences in Spanish.

const SYSTEM_PROMPT =
  'Eres un asistente fiscal. Basándote en los datos financieros del autónomo o empresa, ' +
  'escribe un resumen narrativo breve (máximo 3 frases) en español que cubra: ' +
  '(1) la salud general de ingresos y gastos, ' +
  '(2) el IVA pendiente de declarar, ' +
  '(3) la concentración de ingresos en el cliente principal. ' +
  'Usa importes reales con el símbolo €. No incluyas encabezados ni listas, solo prosa.';

function buildUserMessage(summary, monthly, clients) {
  const lastMonths = monthly.slice(-3);
  const topClient = clients[0];

  const lines = [
    `Período analizado: ${summary.periodo.desde} a ${summary.periodo.hasta}`,
    `Ingresos totales: €${summary.ingresos_totales}`,
    `Gastos totales: €${summary.gastos_totales}`,
    `Beneficio neto: €${summary.beneficio_neto}`,
    `IVA repercutido: €${summary.iva_repercutido}`,
    `IVA soportado: €${summary.iva_soportado}`,
    `IVA a pagar (pendiente de declarar): €${summary.iva_a_pagar}`,
    `IRPF retenido por clientes: €${summary.irpf_retenido}`,
    `Número de facturas: ${summary.num_facturas}`,
    `Número de clientes: ${summary.num_clientes}`,
    `Ticket medio: €${summary.ticket_medio}`,
    '',
    'Evolución últimos 3 meses:',
    ...lastMonths.map((m) => `  ${m.mes}: ingresos €${m.ingresos}, gastos €${m.gastos}`),
  ];

  if (topClient) {
    const pct = summary.ingresos_totales > 0
      ? ((topClient.facturado / summary.ingresos_totales) * 100).toFixed(1)
      : '0.0';
    lines.push('');
    lines.push(`Cliente principal: ${topClient.cliente} — €${topClient.facturado} (${pct}% de los ingresos, ${topClient.num_facturas} facturas)`);
  }

  return lines.join('\n');
}

async function generateDashboardNarrative(summary, monthly, clients) {
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
          { role: 'user',   content: buildUserMessage(summary, monthly, clients) },
        ],
        max_tokens: 400,
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
  if (!content) throw new Error('Azure AI Foundry returned an empty narrative');

  return content;
}

module.exports = { generateDashboardNarrative };
