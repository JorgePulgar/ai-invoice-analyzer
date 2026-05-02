import type { ClientEntry, MonthlyEntry, SupplierEntry, Summary } from '../types';
import { formatCurrency } from './format';

export function deriveInsights(
  summary: Summary,
  monthly: MonthlyEntry[],
  clients: ClientEntry[],
  suppliers: SupplierEntry[],
): string[] {
  void suppliers; // reserved for future rules
  const insights: string[] = [];

  // 1. Revenue trend — last month vs month before
  if (monthly.length >= 2) {
    const last = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    if (prev.ingresos > 0) {
      const pct = ((last.ingresos - prev.ingresos) / prev.ingresos) * 100;
      if (Math.abs(pct) >= 5) {
        const verb = pct >= 0 ? 'subieron' : 'bajaron';
        insights.push(`Tus ingresos ${verb} un ${Math.abs(Math.round(pct))}% este mes.`);
      }
    }
  }

  // 2. Expense trend — last month vs month before
  if (monthly.length >= 2) {
    const last = monthly[monthly.length - 1];
    const prev = monthly[monthly.length - 2];
    if (prev.gastos > 0) {
      const pct = ((last.gastos - prev.gastos) / prev.gastos) * 100;
      if (Math.abs(pct) >= 5) {
        const verb = pct >= 0 ? 'subieron' : 'bajaron';
        insights.push(`Tus gastos ${verb} un ${Math.abs(Math.round(pct))}% este mes.`);
      }
    }
  }

  // 3. Client concentration
  if (clients.length > 0 && summary.ingresos_totales > 0) {
    const pct = (clients[0].facturado / summary.ingresos_totales) * 100;
    if (pct > 35) {
      insights.push(`El cliente principal representa el ${Math.round(pct)}% de tus ingresos.`);
    }
  }

  // 4. VAT alert
  if (summary.iva_a_pagar > 0) {
    insights.push(`Tienes ${formatCurrency(summary.iva_a_pagar)} de IVA pendiente de declarar.`);
  }

  // 5. IRPF notice
  if (summary.irpf_retenido > 0) {
    insights.push(
      `Tus clientes ya han retenido ${formatCurrency(summary.irpf_retenido)} de IRPF en tu nombre.`,
    );
  }

  return insights.slice(0, 5);
}
