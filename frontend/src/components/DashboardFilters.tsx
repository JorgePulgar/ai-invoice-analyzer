import { useSearchParams } from 'react-router-dom';
import type { Factura } from '../types';
import {
  type FilterState,
  type PeriodoOption,
  type TipoOption,
  isDefaultFilters,
  parseFilters,
} from '../utils/filters';

interface DashboardFiltersProps {
  facturas: Factura[];
}

const PERIODO_LABELS: Record<PeriodoOption, string> = {
  todos: 'All periods',
  mes: 'This month',
  trimestre: 'Current quarter',
  anio: 'This year',
  anio12: 'Last 12 months',
};

const TIPO_LABELS: Record<TipoOption, string> = {
  todos: 'All',
  ingreso: 'Income',
  gasto: 'Expenses',
};

const selectClass =
  'bg-bn-elevated border border-bn-hairline text-bn-body text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-bn-yellow/40 focus:border-bn-yellow transition-colors cursor-pointer';

export function DashboardFilters({ facturas }: DashboardFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const state: FilterState = parseFilters(searchParams);

  const clientes = Array.from(
    new Set(facturas.filter((f) => f.tipo === 'ingreso').map((f) => f.receptor)),
  ).sort();

  function update(patch: Partial<FilterState>) {
    const next = { ...state, ...patch };
    const params = new URLSearchParams();
    if (next.periodo !== 'todos') params.set('periodo', next.periodo);
    if (next.tipo !== 'todos') params.set('tipo', next.tipo);
    if (next.cliente && next.tipo !== 'gasto') params.set('cliente', next.cliente);
    setSearchParams(params, { replace: true });
  }

  const hasFilters = !isDefaultFilters(state);
  const clienteDisabled = state.tipo === 'gasto';

  return (
    <div className="bg-bn-card border border-bn-hairline rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 mb-6">
      <span className="text-xs font-semibold text-bn-muted uppercase tracking-wide shrink-0">
        Filters
      </span>

      <select
        value={state.periodo}
        onChange={(e) => update({ periodo: e.target.value as PeriodoOption })}
        className={selectClass}
      >
        {(Object.keys(PERIODO_LABELS) as PeriodoOption[]).map((k) => (
          <option key={k} value={k}>
            {PERIODO_LABELS[k]}
          </option>
        ))}
      </select>

      <select
        value={state.tipo}
        onChange={(e) => {
          const tipo = e.target.value as TipoOption;
          update({ tipo, cliente: tipo === 'gasto' ? null : state.cliente });
        }}
        className={selectClass}
      >
        {(Object.keys(TIPO_LABELS) as TipoOption[]).map((k) => (
          <option key={k} value={k}>
            {TIPO_LABELS[k]}
          </option>
        ))}
      </select>

      <select
        value={state.cliente ?? ''}
        disabled={clienteDisabled}
        onChange={(e) => update({ cliente: e.target.value || null })}
        className={`${selectClass} ${clienteDisabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        <option value="">All clients</option>
        {clientes.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          onClick={() => setSearchParams({}, { replace: true })}
          className="text-xs font-medium text-bn-yellow hover:text-bn-yellow-hover transition-colors ml-auto"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
