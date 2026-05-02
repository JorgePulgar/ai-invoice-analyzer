import { describe, it, expect } from 'vitest';
import type { ClientEntry, MonthlyEntry, SupplierEntry, Summary } from '../../src/types';
import { deriveInsights } from '../../src/utils/insights';

function makeSummary(overrides: Partial<Summary> = {}): Summary {
  return {
    ingresos_totales: 10000,
    gastos_totales: 500,
    beneficio_neto: 9500,
    iva_repercutido: 2100,
    iva_soportado: 105,
    iva_a_pagar: 1995,
    irpf_retenido: 1500,
    num_facturas: 5,
    num_clientes: 2,
    ticket_medio: 2000,
    moneda: 'EUR',
    periodo: { desde: '2026-01-01', hasta: '2026-04-30' },
    ...overrides,
  };
}

function makeMonthly(values: Array<{ ingresos: number; gastos: number }>): MonthlyEntry[] {
  return values.map((v, i) => ({
    mes: `2026-${String(i + 1).padStart(2, '0')}`,
    ...v,
  }));
}

const noClients: ClientEntry[] = [];
const noSuppliers: SupplierEntry[] = [];

// ---------------------------------------------------------------------------
describe('deriveInsights — empty / zero-data guards', () => {
  it('returns empty array for minimal zero data', () => {
    const summary = makeSummary({
      ingresos_totales: 0,
      iva_a_pagar: 0,
      irpf_retenido: 0,
    });
    const result = deriveInsights(summary, [], noClients, noSuppliers);
    expect(result).toEqual([]);
  });

  it('returns at most 5 insights', () => {
    const summary = makeSummary();
    const monthly = makeMonthly([
      { ingresos: 100, gastos: 100 },
      { ingresos: 1000, gastos: 1000 }, // big swing for both trends
    ]);
    const clients: ClientEntry[] = [
      { cliente: 'Big Client', facturado: 8000, num_facturas: 1 }, // >35% concentration
    ];
    const result = deriveInsights(summary, monthly, clients, noSuppliers);
    expect(result.length).toBeLessThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
describe('deriveInsights — revenue trend', () => {
  it('emits when ingresos rose >= 5%', () => {
    const monthly = makeMonthly([
      { ingresos: 1000, gastos: 0 },
      { ingresos: 1200, gastos: 0 }, // +20%
    ]);
    const result = deriveInsights(makeSummary(), monthly, noClients, noSuppliers);
    expect(result.some((s) => s.includes('subieron') && s.includes('ingresos'))).toBe(true);
  });

  it('emits when ingresos fell >= 5%', () => {
    const monthly = makeMonthly([
      { ingresos: 1000, gastos: 0 },
      { ingresos: 800, gastos: 0 }, // -20%
    ]);
    const result = deriveInsights(makeSummary(), monthly, noClients, noSuppliers);
    expect(result.some((s) => s.includes('bajaron') && s.includes('ingresos'))).toBe(true);
  });

  it('does NOT emit when change is below 5%', () => {
    const monthly = makeMonthly([
      { ingresos: 1000, gastos: 0 },
      { ingresos: 1030, gastos: 0 }, // +3%
    ]);
    const result = deriveInsights(makeSummary(), monthly, noClients, noSuppliers);
    expect(result.some((s) => s.includes('ingresos') && (s.includes('subieron') || s.includes('bajaron')))).toBe(false);
  });

  it('does NOT emit when fewer than 2 monthly entries', () => {
    const monthly = makeMonthly([{ ingresos: 5000, gastos: 0 }]);
    const result = deriveInsights(makeSummary(), monthly, noClients, noSuppliers);
    expect(result.some((s) => s.includes('ingresos') && s.includes('subieron'))).toBe(false);
  });

  it('does NOT emit when previous month ingresos is 0', () => {
    const monthly = makeMonthly([
      { ingresos: 0, gastos: 0 },
      { ingresos: 1000, gastos: 0 },
    ]);
    const result = deriveInsights(makeSummary(), monthly, noClients, noSuppliers);
    expect(result.some((s) => s.includes('ingresos') && s.includes('subieron'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('deriveInsights — expense trend', () => {
  it('emits when gastos rose >= 5%', () => {
    const monthly = makeMonthly([
      { ingresos: 1000, gastos: 200 },
      { ingresos: 1000, gastos: 400 }, // +100%
    ]);
    const result = deriveInsights(makeSummary(), monthly, noClients, noSuppliers);
    expect(result.some((s) => s.includes('gastos') && s.includes('subieron'))).toBe(true);
  });

  it('emits when gastos fell >= 5%', () => {
    const monthly = makeMonthly([
      { ingresos: 1000, gastos: 400 },
      { ingresos: 1000, gastos: 200 }, // -50%
    ]);
    const result = deriveInsights(makeSummary(), monthly, noClients, noSuppliers);
    expect(result.some((s) => s.includes('gastos') && s.includes('bajaron'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('deriveInsights — client concentration', () => {
  it('emits when top client > 35% of ingresos', () => {
    const summary = makeSummary({ ingresos_totales: 10000 });
    const clients: ClientEntry[] = [{ cliente: 'Big Co', facturado: 4000, num_facturas: 1 }]; // 40%
    const result = deriveInsights(summary, [], clients, noSuppliers);
    expect(result.some((s) => s.includes('cliente principal') && s.includes('40%'))).toBe(true);
  });

  it('does NOT emit when top client <= 35%', () => {
    const summary = makeSummary({ ingresos_totales: 10000 });
    const clients: ClientEntry[] = [{ cliente: 'Normal Co', facturado: 3500, num_facturas: 1 }]; // 35%
    const result = deriveInsights(summary, [], clients, noSuppliers);
    expect(result.some((s) => s.includes('cliente principal'))).toBe(false);
  });

  it('does NOT emit when clients array is empty', () => {
    const result = deriveInsights(makeSummary(), [], noClients, noSuppliers);
    expect(result.some((s) => s.includes('cliente principal'))).toBe(false);
  });

  it('does NOT emit when ingresos_totales is 0', () => {
    const summary = makeSummary({ ingresos_totales: 0 });
    const clients: ClientEntry[] = [{ cliente: 'Any Co', facturado: 100, num_facturas: 1 }];
    const result = deriveInsights(summary, [], clients, noSuppliers);
    expect(result.some((s) => s.includes('cliente principal'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('deriveInsights — VAT alert', () => {
  it('emits when iva_a_pagar > 0', () => {
    const summary = makeSummary({ iva_a_pagar: 500 });
    const result = deriveInsights(summary, [], noClients, noSuppliers);
    expect(result.some((s) => s.includes('IVA pendiente'))).toBe(true);
  });

  it('does NOT emit when iva_a_pagar is 0', () => {
    const summary = makeSummary({ iva_a_pagar: 0 });
    const result = deriveInsights(summary, [], noClients, noSuppliers);
    expect(result.some((s) => s.includes('IVA pendiente'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
describe('deriveInsights — IRPF notice', () => {
  it('emits when irpf_retenido > 0', () => {
    const summary = makeSummary({ irpf_retenido: 1500 });
    const result = deriveInsights(summary, [], noClients, noSuppliers);
    expect(result.some((s) => s.includes('IRPF'))).toBe(true);
  });

  it('does NOT emit when irpf_retenido is 0', () => {
    const summary = makeSummary({ irpf_retenido: 0 });
    const result = deriveInsights(summary, [], noClients, noSuppliers);
    expect(result.some((s) => s.includes('IRPF'))).toBe(false);
  });
});
