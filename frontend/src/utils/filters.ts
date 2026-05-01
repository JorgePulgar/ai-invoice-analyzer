import type { ClientEntry, Factura, MonthlyEntry, Summary, VatEntry } from '../types';

export type PeriodoOption = 'todos' | 'mes' | 'trimestre' | 'anio' | 'anio12';
export type TipoOption = 'todos' | 'ingreso' | 'gasto';

export interface FilterState {
  periodo: PeriodoOption;
  tipo: TipoOption;
  cliente: string | null;
}

export const DEFAULT_FILTERS: FilterState = {
  periodo: 'todos',
  tipo: 'todos',
  cliente: null,
};

export function parseFilters(params: URLSearchParams): FilterState {
  const periodo = params.get('periodo') as PeriodoOption | null;
  const tipo = params.get('tipo') as TipoOption | null;
  const cliente = params.get('cliente');

  const validPeriodo: PeriodoOption[] = ['todos', 'mes', 'trimestre', 'anio', 'anio12'];
  const validTipo: TipoOption[] = ['todos', 'ingreso', 'gasto'];

  return {
    periodo: validPeriodo.includes(periodo as PeriodoOption) ? (periodo as PeriodoOption) : 'todos',
    tipo: validTipo.includes(tipo as TipoOption) ? (tipo as TipoOption) : 'todos',
    cliente: cliente || null,
  };
}

export function isDefaultFilters(state: FilterState): boolean {
  return state.periodo === 'todos' && state.tipo === 'todos' && state.cliente === null;
}

function getPeriodoWindow(option: PeriodoOption, today: Date): { desde: Date; hasta: Date } | null {
  if (option === 'todos') return null;

  const year = today.getFullYear();
  const month = today.getMonth();

  if (option === 'mes') {
    return {
      desde: new Date(year, month, 1),
      hasta: new Date(year, month + 1, 0),
    };
  }
  if (option === 'trimestre') {
    const q = Math.floor(month / 3);
    return {
      desde: new Date(year, q * 3, 1),
      hasta: new Date(year, q * 3 + 3, 0),
    };
  }
  if (option === 'anio') {
    return {
      desde: new Date(year, 0, 1),
      hasta: new Date(year, 11, 31),
    };
  }
  if (option === 'anio12') {
    const desde = new Date(today);
    desde.setMonth(desde.getMonth() - 11);
    desde.setDate(1);
    return { desde, hasta: today };
  }
  return null;
}

export function applyFilters(facturas: Factura[], state: FilterState, today = new Date()): Factura[] {
  let result = facturas;

  const window = getPeriodoWindow(state.periodo, today);
  if (window) {
    result = result.filter((f) => {
      const d = new Date(f.fecha);
      return d >= window.desde && d <= window.hasta;
    });
  }

  if (state.tipo !== 'todos') {
    result = result.filter((f) => f.tipo === state.tipo);
  }

  if (state.cliente) {
    result = result.filter((f) => f.receptor === state.cliente);
  }

  return result;
}

export function deriveSummary(facturas: Factura[]): Summary {
  const ingresos = facturas.filter((f) => f.tipo === 'ingreso');
  const gastos = facturas.filter((f) => f.tipo === 'gasto');

  const ingresos_totales = ingresos.reduce((s, f) => s + f.total, 0);
  const gastos_totales = gastos.reduce((s, f) => s + f.total, 0);
  const iva_repercutido = ingresos.reduce((s, f) => s + f.iva_cantidad, 0);
  const iva_soportado = gastos.reduce((s, f) => s + f.iva_cantidad, 0);
  const irpf_retenido = ingresos.reduce((s, f) => s + f.irpf_cantidad, 0);

  const receptores = new Set(ingresos.map((f) => f.receptor));
  const fechas = facturas.map((f) => f.fecha).sort();

  return {
    ingresos_totales,
    gastos_totales,
    beneficio_neto: ingresos_totales - gastos_totales,
    iva_repercutido,
    iva_soportado,
    iva_a_pagar: iva_repercutido - iva_soportado,
    irpf_retenido,
    num_facturas: facturas.length,
    num_clientes: receptores.size,
    ticket_medio: facturas.length > 0 ? (ingresos_totales + gastos_totales) / facturas.length : 0,
    moneda: 'EUR',
    periodo: {
      desde: fechas[0] ?? '',
      hasta: fechas[fechas.length - 1] ?? '',
    },
  };
}

export function deriveMonthly(facturas: Factura[], today = new Date()): MonthlyEntry[] {
  const months: MonthlyEntry[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({ mes: label, ingresos: 0, gastos: 0 });
  }

  for (const f of facturas) {
    const label = f.fecha.slice(0, 7); // YYYY-MM
    const bucket = months.find((m) => m.mes === label);
    if (bucket) {
      if (f.tipo === 'ingreso') bucket.ingresos += f.total;
      else bucket.gastos += f.total;
    }
  }

  return months;
}

export function deriveClients(facturas: Factura[]): ClientEntry[] {
  const map = new Map<string, ClientEntry>();

  for (const f of facturas.filter((f) => f.tipo === 'ingreso')) {
    const existing = map.get(f.receptor);
    if (existing) {
      existing.facturado += f.total;
      existing.num_facturas += 1;
    } else {
      map.set(f.receptor, { cliente: f.receptor, facturado: f.total, num_facturas: 1 });
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.facturado - a.facturado)
    .slice(0, 10);
}

export function deriveVat(facturas: Factura[], today = new Date()): VatEntry[] {
  const year = today.getFullYear();
  const quarters: VatEntry[] = [
    { trimestre: 'T1', anio: year, iva_repercutido: 0, iva_soportado: 0, iva_a_pagar: 0 },
    { trimestre: 'T2', anio: year, iva_repercutido: 0, iva_soportado: 0, iva_a_pagar: 0 },
    { trimestre: 'T3', anio: year, iva_repercutido: 0, iva_soportado: 0, iva_a_pagar: 0 },
    { trimestre: 'T4', anio: year, iva_repercutido: 0, iva_soportado: 0, iva_a_pagar: 0 },
  ];

  for (const f of facturas) {
    const d = new Date(f.fecha);
    if (d.getFullYear() !== year) continue;
    const q = Math.floor(d.getMonth() / 3);
    const bucket = quarters[q];
    if (f.tipo === 'ingreso') bucket.iva_repercutido += f.iva_cantidad;
    else bucket.iva_soportado += f.iva_cantidad;
  }

  for (const q of quarters) {
    q.iva_a_pagar = q.iva_repercutido - q.iva_soportado;
  }

  return quarters;
}
