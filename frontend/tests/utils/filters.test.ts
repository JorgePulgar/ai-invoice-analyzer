import { describe, it, expect } from 'vitest';
import type { Factura } from '../../src/types';
import {
  DEFAULT_FILTERS,
  parseFilters,
  isDefaultFilters,
  applyFilters,
  deriveSummary,
  deriveMonthly,
  deriveClients,
  deriveVat,
  deriveSuppliers,
} from '../../src/utils/filters';

// Fixed reference date for all date-sensitive tests: 2026-04-15 (Q2 2026)
const TODAY = new Date(2026, 3, 15); // month is 0-indexed

let nextId = 1;
function makeFactura(overrides: Partial<Factura> = {}): Factura {
  return {
    id: nextId++,
    numero: `F-${String(nextId).padStart(3, '0')}`,
    fecha: '2026-04-10',
    emisor: 'Self SL',
    receptor: 'ACME SA',
    concepto: null,
    base_imponible: 1000,
    iva_porcentaje: 21,
    iva_cantidad: 210,
    irpf_porcentaje: 15,
    irpf_cantidad: 150,
    total: 1060,
    moneda: 'EUR',
    tipo: 'ingreso',
    created_at: '2026-04-10T10:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// parseFilters
// ---------------------------------------------------------------------------
describe('parseFilters', () => {
  it('returns DEFAULT_FILTERS for empty params', () => {
    const result = parseFilters(new URLSearchParams());
    expect(result).toEqual(DEFAULT_FILTERS);
  });

  it('preserves valid periodo', () => {
    const result = parseFilters(new URLSearchParams('periodo=mes'));
    expect(result.periodo).toBe('mes');
  });

  it('falls back to "todos" for invalid periodo', () => {
    const result = parseFilters(new URLSearchParams('periodo=invalid'));
    expect(result.periodo).toBe('todos');
  });

  it('preserves valid tipo', () => {
    const result = parseFilters(new URLSearchParams('tipo=ingreso'));
    expect(result.tipo).toBe('ingreso');
  });

  it('falls back to "todos" for invalid tipo', () => {
    const result = parseFilters(new URLSearchParams('tipo=junk'));
    expect(result.tipo).toBe('todos');
  });

  it('preserves cliente param', () => {
    const result = parseFilters(new URLSearchParams('cliente=ACME SA'));
    expect(result.cliente).toBe('ACME SA');
  });

  it('returns null cliente when param is absent', () => {
    const result = parseFilters(new URLSearchParams());
    expect(result.cliente).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isDefaultFilters
// ---------------------------------------------------------------------------
describe('isDefaultFilters', () => {
  it('returns true for DEFAULT_FILTERS', () => {
    expect(isDefaultFilters(DEFAULT_FILTERS)).toBe(true);
  });

  it('returns false when periodo is non-default', () => {
    expect(isDefaultFilters({ ...DEFAULT_FILTERS, periodo: 'mes' })).toBe(false);
  });

  it('returns false when tipo is non-default', () => {
    expect(isDefaultFilters({ ...DEFAULT_FILTERS, tipo: 'ingreso' })).toBe(false);
  });

  it('returns false when cliente is set', () => {
    expect(isDefaultFilters({ ...DEFAULT_FILTERS, cliente: 'ACME SA' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// applyFilters
// ---------------------------------------------------------------------------
describe('applyFilters', () => {
  it('returns empty array for empty input', () => {
    expect(applyFilters([], DEFAULT_FILTERS, TODAY)).toHaveLength(0);
  });

  it('returns all rows for DEFAULT_FILTERS', () => {
    const facturas = [makeFactura(), makeFactura({ fecha: '2025-11-01' })];
    expect(applyFilters(facturas, DEFAULT_FILTERS, TODAY)).toHaveLength(2);
  });

  it('periodo=mes keeps only current-month rows', () => {
    const facturas = [
      makeFactura({ fecha: '2026-04-10' }), // April 2026 ✓
      makeFactura({ fecha: '2026-03-31' }), // March 2026 ✗
      makeFactura({ fecha: '2026-05-01' }), // May 2026 ✗
    ];
    const result = applyFilters(facturas, { ...DEFAULT_FILTERS, periodo: 'mes' }, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0].fecha).toBe('2026-04-10');
  });

  it('periodo=trimestre keeps only Q2 2026 rows (Apr–Jun)', () => {
    const facturas = [
      makeFactura({ fecha: '2026-04-10' }), // Q2 ✓
      makeFactura({ fecha: '2026-06-15' }), // Q2 ✓
      makeFactura({ fecha: '2026-03-15' }), // Q1 ✗
      makeFactura({ fecha: '2026-07-10' }), // Q3 ✗
    ];
    const result = applyFilters(facturas, { ...DEFAULT_FILTERS, periodo: 'trimestre' }, TODAY);
    expect(result).toHaveLength(2);
  });

  it('periodo=anio keeps only 2026 rows', () => {
    const facturas = [
      makeFactura({ fecha: '2026-01-15' }), // ✓
      makeFactura({ fecha: '2026-12-15' }), // ✓
      makeFactura({ fecha: '2025-06-15' }), // ✗
    ];
    const result = applyFilters(facturas, { ...DEFAULT_FILTERS, periodo: 'anio' }, TODAY);
    expect(result).toHaveLength(2);
  });

  it('periodo=anio12 with today=2026-04-15 keeps rows from 2025-05-01 onwards', () => {
    const facturas = [
      makeFactura({ fecha: '2025-05-15' }), // ✓ inside window
      makeFactura({ fecha: '2025-04-15' }), // ✗ before window
      makeFactura({ fecha: '2026-04-10' }), // ✓ recent
    ];
    const result = applyFilters(facturas, { ...DEFAULT_FILTERS, periodo: 'anio12' }, TODAY);
    expect(result).toHaveLength(2);
  });

  it('tipo=ingreso keeps only ingreso rows', () => {
    const facturas = [
      makeFactura({ tipo: 'ingreso' }),
      makeFactura({ tipo: 'gasto' }),
    ];
    const result = applyFilters(facturas, { ...DEFAULT_FILTERS, tipo: 'ingreso' }, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0].tipo).toBe('ingreso');
  });

  it('tipo=gasto keeps only gasto rows', () => {
    const facturas = [
      makeFactura({ tipo: 'ingreso' }),
      makeFactura({ tipo: 'gasto' }),
    ];
    const result = applyFilters(facturas, { ...DEFAULT_FILTERS, tipo: 'gasto' }, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0].tipo).toBe('gasto');
  });

  it('cliente filter keeps only matching receptor', () => {
    const facturas = [
      makeFactura({ receptor: 'ACME SA' }),
      makeFactura({ receptor: 'Other Corp' }),
    ];
    const result = applyFilters(facturas, { ...DEFAULT_FILTERS, cliente: 'ACME SA' }, TODAY);
    expect(result).toHaveLength(1);
    expect(result[0].receptor).toBe('ACME SA');
  });

  it('combined filters apply all conditions (AND)', () => {
    const facturas = [
      makeFactura({ fecha: '2026-04-10', tipo: 'ingreso', receptor: 'ACME SA' }), // ✓
      makeFactura({ fecha: '2026-04-10', tipo: 'gasto',   receptor: 'ACME SA' }), // ✗ tipo
      makeFactura({ fecha: '2026-03-10', tipo: 'ingreso', receptor: 'ACME SA' }), // ✗ mes
      makeFactura({ fecha: '2026-04-10', tipo: 'ingreso', receptor: 'Other'   }), // ✗ cliente
    ];
    const result = applyFilters(
      facturas,
      { periodo: 'mes', tipo: 'ingreso', cliente: 'ACME SA' },
      TODAY,
    );
    expect(result).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// deriveSummary
// ---------------------------------------------------------------------------
describe('deriveSummary', () => {
  it('returns all zeros for empty input', () => {
    const s = deriveSummary([]);
    expect(s.ingresos_totales).toBe(0);
    expect(s.gastos_totales).toBe(0);
    expect(s.beneficio_neto).toBe(0);
    expect(s.iva_a_pagar).toBe(0);
    expect(s.num_facturas).toBe(0);
    expect(s.ticket_medio).toBe(0);
    expect(s.periodo.desde).toBe('');
    expect(s.periodo.hasta).toBe('');
  });

  it('correctly sums ingresos and leaves gastos at 0', () => {
    const facturas = [
      makeFactura({ tipo: 'ingreso', total: 1060, iva_cantidad: 210, irpf_cantidad: 150 }),
      makeFactura({ tipo: 'ingreso', total: 2120, iva_cantidad: 420, irpf_cantidad: 300 }),
    ];
    const s = deriveSummary(facturas);
    expect(s.ingresos_totales).toBe(3180);
    expect(s.gastos_totales).toBe(0);
    expect(s.beneficio_neto).toBe(3180);
    expect(s.iva_repercutido).toBe(630);
    expect(s.iva_soportado).toBe(0);
  });

  it('correctly sums gastos and leaves ingresos at 0', () => {
    const facturas = [makeFactura({ tipo: 'gasto', total: 500, iva_cantidad: 90 })];
    const s = deriveSummary(facturas);
    expect(s.gastos_totales).toBe(500);
    expect(s.ingresos_totales).toBe(0);
    expect(s.beneficio_neto).toBe(-500);
    expect(s.iva_soportado).toBe(90);
    expect(s.iva_repercutido).toBe(0);
  });

  it('computes beneficio_neto and iva_a_pagar for mixed input', () => {
    const facturas = [
      makeFactura({ tipo: 'ingreso', total: 1060, iva_cantidad: 210 }),
      makeFactura({ tipo: 'gasto',   total: 500,  iva_cantidad: 90  }),
    ];
    const s = deriveSummary(facturas);
    expect(s.beneficio_neto).toBe(560);
    expect(s.iva_a_pagar).toBe(120);
  });

  it('counts unique receptores for num_clientes (ingreso only)', () => {
    const facturas = [
      makeFactura({ tipo: 'ingreso', receptor: 'A' }),
      makeFactura({ tipo: 'ingreso', receptor: 'A' }),
      makeFactura({ tipo: 'ingreso', receptor: 'B' }),
      makeFactura({ tipo: 'gasto',   receptor: 'C' }), // gasto, not counted
    ];
    const s = deriveSummary(facturas);
    expect(s.num_clientes).toBe(2);
  });

  it('sets periodo.desde and hasta from sorted fechas', () => {
    const facturas = [
      makeFactura({ fecha: '2026-03-01' }),
      makeFactura({ fecha: '2026-01-15' }),
      makeFactura({ fecha: '2026-04-30' }),
    ];
    const s = deriveSummary(facturas);
    expect(s.periodo.desde).toBe('2026-01-15');
    expect(s.periodo.hasta).toBe('2026-04-30');
  });
});

// ---------------------------------------------------------------------------
// deriveMonthly
// ---------------------------------------------------------------------------
describe('deriveMonthly', () => {
  it('returns exactly 12 entries for empty input', () => {
    const result = deriveMonthly([], TODAY);
    expect(result).toHaveLength(12);
  });

  it('all entries are zero for empty input', () => {
    const result = deriveMonthly([], TODAY);
    expect(result.every((m) => m.ingresos === 0 && m.gastos === 0)).toBe(true);
  });

  it('with today=2026-04-15, first entry is 2025-05 and last is 2026-04', () => {
    const result = deriveMonthly([], TODAY);
    expect(result[0].mes).toBe('2025-05');
    expect(result[11].mes).toBe('2026-04');
  });

  it('entries are in chronological order', () => {
    const result = deriveMonthly([], TODAY);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].mes > result[i - 1].mes).toBe(true);
    }
  });

  it('places ingreso totals in the correct month bucket', () => {
    const facturas = [makeFactura({ fecha: '2026-04-10', tipo: 'ingreso', total: 1060 })];
    const result = deriveMonthly(facturas, TODAY);
    const april = result.find((m) => m.mes === '2026-04');
    expect(april?.ingresos).toBe(1060);
    expect(april?.gastos).toBe(0);
  });

  it('places gasto totals in the correct month bucket', () => {
    const facturas = [makeFactura({ fecha: '2026-02-15', tipo: 'gasto', total: 500 })];
    const result = deriveMonthly(facturas, TODAY);
    const feb = result.find((m) => m.mes === '2026-02');
    expect(feb?.gastos).toBe(500);
    expect(feb?.ingresos).toBe(0);
  });

  it('ignores rows outside the 12-month window', () => {
    const facturas = [makeFactura({ fecha: '2025-04-30', total: 999 })]; // one month before window
    const result = deriveMonthly(facturas, TODAY);
    expect(result.every((m) => m.ingresos === 0 && m.gastos === 0)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// deriveClients
// ---------------------------------------------------------------------------
describe('deriveClients', () => {
  it('returns empty array for empty input', () => {
    expect(deriveClients([])).toHaveLength(0);
  });

  it('ignores gasto rows entirely', () => {
    const facturas = [makeFactura({ tipo: 'gasto', receptor: 'ACME SA', total: 500 })];
    expect(deriveClients(facturas)).toHaveLength(0);
  });

  it('aggregates multiple invoices for the same receptor', () => {
    const facturas = [
      makeFactura({ tipo: 'ingreso', receptor: 'ACME SA', total: 1000 }),
      makeFactura({ tipo: 'ingreso', receptor: 'ACME SA', total: 2000 }),
    ];
    const result = deriveClients(facturas);
    expect(result).toHaveLength(1);
    expect(result[0].facturado).toBe(3000);
    expect(result[0].num_facturas).toBe(2);
  });

  it('sorts descending by facturado', () => {
    const facturas = [
      makeFactura({ tipo: 'ingreso', receptor: 'Small Co', total: 100 }),
      makeFactura({ tipo: 'ingreso', receptor: 'Big Corp', total: 9000 }),
      makeFactura({ tipo: 'ingreso', receptor: 'Mid Ltd',  total: 500  }),
    ];
    const result = deriveClients(facturas);
    expect(result[0].cliente).toBe('Big Corp');
    expect(result[1].cliente).toBe('Mid Ltd');
    expect(result[2].cliente).toBe('Small Co');
  });

  it('truncates to top 10 clients', () => {
    const facturas = Array.from({ length: 12 }, (_, i) =>
      makeFactura({ tipo: 'ingreso', receptor: `Client ${i}`, total: (12 - i) * 100 }),
    );
    const result = deriveClients(facturas);
    expect(result).toHaveLength(10);
  });
});

// ---------------------------------------------------------------------------
// deriveVat
// ---------------------------------------------------------------------------
describe('deriveVat', () => {
  it('returns 4 zero quarters for empty input', () => {
    const result = deriveVat([], TODAY);
    expect(result).toHaveLength(4);
    expect(result.every((q) => q.iva_repercutido === 0 && q.iva_soportado === 0 && q.iva_a_pagar === 0)).toBe(true);
  });

  it('quarters are labelled T1–T4 with current year', () => {
    const result = deriveVat([], TODAY);
    expect(result.map((q) => q.trimestre)).toEqual(['T1', 'T2', 'T3', 'T4']);
    expect(result.every((q) => q.anio === 2026)).toBe(true);
  });

  it('ingreso iva_cantidad goes to iva_repercutido', () => {
    const facturas = [makeFactura({ fecha: '2026-01-10', tipo: 'ingreso', iva_cantidad: 210 })];
    const result = deriveVat(facturas, TODAY);
    expect(result[0].iva_repercutido).toBe(210); // T1
    expect(result[0].iva_soportado).toBe(0);
  });

  it('gasto iva_cantidad goes to iva_soportado', () => {
    const facturas = [makeFactura({ fecha: '2026-04-10', tipo: 'gasto', iva_cantidad: 90 })];
    const result = deriveVat(facturas, TODAY);
    expect(result[1].iva_soportado).toBe(90); // T2
    expect(result[1].iva_repercutido).toBe(0);
  });

  it('computes iva_a_pagar = iva_repercutido - iva_soportado per quarter', () => {
    const facturas = [
      makeFactura({ fecha: '2026-01-10', tipo: 'ingreso', iva_cantidad: 300 }),
      makeFactura({ fecha: '2026-02-10', tipo: 'gasto',   iva_cantidad: 100 }),
    ];
    const result = deriveVat(facturas, TODAY);
    expect(result[0].iva_a_pagar).toBe(200); // T1
  });

  it('skips rows from prior years', () => {
    const facturas = [makeFactura({ fecha: '2025-12-31', tipo: 'ingreso', iva_cantidad: 999 })];
    const result = deriveVat(facturas, TODAY);
    expect(result.every((q) => q.iva_repercutido === 0)).toBe(true);
  });

  it('assigns months to correct quarters', () => {
    const monthQuarterMap: [string, number][] = [
      ['2026-01-15', 0], ['2026-02-15', 0], ['2026-03-15', 0], // T1
      ['2026-04-15', 1], ['2026-05-15', 1], ['2026-06-15', 1], // T2
      ['2026-07-15', 2], ['2026-08-15', 2], ['2026-09-15', 2], // T3
      ['2026-10-15', 3], ['2026-11-15', 3], ['2026-12-15', 3], // T4
    ];
    for (const [fecha, qIndex] of monthQuarterMap) {
      const result = deriveVat(
        [makeFactura({ fecha, tipo: 'ingreso', iva_cantidad: 100 })],
        TODAY,
      );
      expect(result[qIndex].iva_repercutido, `fecha ${fecha} should be in Q${qIndex + 1}`).toBe(100);
    }
  });
});

// ---------------------------------------------------------------------------
// deriveSuppliers
// ---------------------------------------------------------------------------
describe('deriveSuppliers', () => {
  it('returns empty array for no facturas', () => {
    expect(deriveSuppliers([])).toEqual([]);
  });

  it('ignores ingreso facturas', () => {
    const result = deriveSuppliers([makeFactura({ tipo: 'ingreso', emisor: 'Self SL' })]);
    expect(result).toHaveLength(0);
  });

  it('aggregates gastos by emisor', () => {
    const facturas = [
      makeFactura({ tipo: 'gasto', emisor: 'AWS', total: 200 }),
      makeFactura({ tipo: 'gasto', emisor: 'AWS', total: 100 }),
    ];
    const result = deriveSuppliers(facturas);
    expect(result).toHaveLength(1);
    expect(result[0].proveedor).toBe('AWS');
    expect(result[0].gastado).toBe(300);
    expect(result[0].num_facturas).toBe(2);
  });

  it('sorts by gastado descending', () => {
    const facturas = [
      makeFactura({ tipo: 'gasto', emisor: 'Cheap Co', total: 50 }),
      makeFactura({ tipo: 'gasto', emisor: 'Expensive Co', total: 500 }),
    ];
    const result = deriveSuppliers(facturas);
    expect(result[0].proveedor).toBe('Expensive Co');
    expect(result[1].proveedor).toBe('Cheap Co');
  });

  it('limits to 10 suppliers', () => {
    const facturas = Array.from({ length: 15 }, (_, i) =>
      makeFactura({ tipo: 'gasto', emisor: `Supplier ${i}`, total: 100 }),
    );
    expect(deriveSuppliers(facturas)).toHaveLength(10);
  });

  it('mixes ingreso and gasto; only gasto counted', () => {
    const facturas = [
      makeFactura({ tipo: 'ingreso', emisor: 'Client A', total: 1000 }),
      makeFactura({ tipo: 'gasto', emisor: 'Vendor B', total: 200 }),
    ];
    const result = deriveSuppliers(facturas);
    expect(result).toHaveLength(1);
    expect(result[0].proveedor).toBe('Vendor B');
  });
});
