import { describe, it, expect } from 'vitest';
import type { ClientEntry, Summary, VatEntry } from '../../src/types';
import { deriveAlerts } from '../../src/utils/alerts';

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

function makeVat(overrides: Partial<VatEntry> = {}): VatEntry {
  return {
    trimestre: 'T1',
    anio: 2026,
    iva_repercutido: 2100,
    iva_soportado: 105,
    iva_a_pagar: 1995,
    ...overrides,
  };
}

function makeClient(facturado: number): ClientEntry {
  return { cliente: 'Test Client', facturado, num_facturas: 1 };
}

describe('deriveAlerts', () => {
  it('returns empty array for empty data', () => {
    const summary = makeSummary({ ingresos_totales: 0 });
    expect(deriveAlerts(summary, [], [], new Date('2026-06-01'))).toEqual([]);
  });

  it('fires client_concentration when top client > 50%', () => {
    const summary = makeSummary({ ingresos_totales: 10000 });
    const clients = [makeClient(6000), makeClient(4000)];
    const alerts = deriveAlerts(summary, [], clients, new Date('2026-06-01'));
    expect(alerts.some((a) => a.key === 'client_concentration')).toBe(true);
    expect(alerts.find((a) => a.key === 'client_concentration')?.severity).toBe('warning');
  });

  it('does not fire client_concentration when top client <= 50%', () => {
    const summary = makeSummary({ ingresos_totales: 10000 });
    const clients = [makeClient(5000), makeClient(5000)];
    const alerts = deriveAlerts(summary, [], clients, new Date('2026-06-01'));
    expect(alerts.some((a) => a.key === 'client_concentration')).toBe(false);
  });

  it('fires vat_due when within 15 days of Q1 end and iva_a_pagar > 0', () => {
    const vat = [makeVat({ trimestre: 'T1', anio: 2026, iva_a_pagar: 500 })];
    // Q1 ends March 31; 10 days before = March 21
    const alerts = deriveAlerts(makeSummary(), vat, [], new Date('2026-03-21'));
    expect(alerts.some((a) => a.key === 'vat_due_T1')).toBe(true);
  });

  it('does not fire vat_due when iva_a_pagar is 0', () => {
    const vat = [makeVat({ trimestre: 'T1', anio: 2026, iva_a_pagar: 0 })];
    const alerts = deriveAlerts(makeSummary(), vat, [], new Date('2026-03-21'));
    expect(alerts.some((a) => a.key === 'vat_due_T1')).toBe(false);
  });

  it('does not fire vat_due when more than 15 days away', () => {
    const vat = [makeVat({ trimestre: 'T1', anio: 2026, iva_a_pagar: 500 })];
    const alerts = deriveAlerts(makeSummary(), vat, [], new Date('2026-03-01'));
    expect(alerts.some((a) => a.key === 'vat_due_T1')).toBe(false);
  });

  it('fires irpf_yearly in December when irpf_retenido > 0', () => {
    const alerts = deriveAlerts(makeSummary({ irpf_retenido: 1500 }), [], [], new Date('2026-12-01'));
    expect(alerts.some((a) => a.key === 'irpf_yearly')).toBe(true);
    expect(alerts.find((a) => a.key === 'irpf_yearly')?.severity).toBe('info');
  });

  it('does not fire irpf_yearly outside December', () => {
    const alerts = deriveAlerts(makeSummary({ irpf_retenido: 1500 }), [], [], new Date('2026-06-01'));
    expect(alerts.some((a) => a.key === 'irpf_yearly')).toBe(false);
  });

  it('does not fire irpf_yearly when irpf_retenido is 0', () => {
    const alerts = deriveAlerts(makeSummary({ irpf_retenido: 0 }), [], [], new Date('2026-12-01'));
    expect(alerts.some((a) => a.key === 'irpf_yearly')).toBe(false);
  });
});
