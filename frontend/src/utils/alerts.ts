import type { ClientEntry, Summary, VatEntry } from '../types';
import { formatCurrency } from './format';

export interface Alert {
  key: string;
  message: string;
  severity: 'info' | 'warning';
}

const QUARTER_ENDS: [number, number][] = [
  [2, 31],
  [5, 30],
  [8, 30],
  [11, 31],
];

const QUARTER_NAMES = ['T1', 'T2', 'T3', 'T4'];

export function deriveAlerts(
  summary: Summary,
  vat: VatEntry[],
  clients: ClientEntry[],
  today = new Date(),
): Alert[] {
  const alerts: Alert[] = [];

  // Client concentration > 50%
  if (clients.length > 0 && summary.ingresos_totales > 0) {
    const pct = (clients[0].facturado / summary.ingresos_totales) * 100;
    if (pct > 50) {
      alerts.push({
        key: 'client_concentration',
        severity: 'warning',
        message: `Tu cliente principal representa más del 50 % de tus ingresos (${pct.toFixed(0)} %). Considera diversificar.`,
      });
    }
  }

  // VAT due within 15 days of quarter-end
  const year = today.getFullYear();
  for (let q = 0; q < 4; q++) {
    const [month, day] = QUARTER_ENDS[q];
    const deadline = new Date(year, month, day);
    const daysUntil = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= 15) {
      const vatEntry = vat.find((v) => v.trimestre === QUARTER_NAMES[q] && v.anio === year);
      if (vatEntry && vatEntry.iva_a_pagar > 0) {
        alerts.push({
          key: `vat_due_${QUARTER_NAMES[q]}`,
          severity: 'warning',
          message: `El plazo de declaración del IVA del ${QUARTER_NAMES[q]} vence en ${daysUntil} día${daysUntil === 1 ? '' : 's'}. IVA a pagar: ${formatCurrency(vatEntry.iva_a_pagar)}.`,
        });
      }
    }
  }

  // IRPF annual notice in December
  if (today.getMonth() === 11 && summary.irpf_retenido > 0) {
    alerts.push({
      key: 'irpf_yearly',
      severity: 'info',
      message: `Tus clientes han retenido ${formatCurrency(summary.irpf_retenido)} de IRPF este año.`,
    });
  }

  return alerts;
}
