import { useSearchParams } from 'react-router-dom';
import type { Factura } from '../types';
import {
  type FilterState,
  type PeriodoOption,
  type TipoOption,
  isDefaultFilters,
  parseFilters,
} from '../utils/filters';

interface Preset {
  label: string;
  desde: string;
  hasta: string;
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function buildPresets(): Preset[] {
  const today = new Date();
  const year = today.getFullYear();

  const minus = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - days);
    return fmt(d);
  };

  return [
    { label: 'Últimos 30 días', desde: minus(30), hasta: fmt(today) },
    { label: 'Últimos 3 meses', desde: minus(90), hasta: fmt(today) },
    { label: 'Este año', desde: `${year}-01-01`, hasta: `${year}-12-31` },
    { label: 'Año anterior', desde: `${year - 1}-01-01`, hasta: `${year - 1}-12-31` },
  ];
}

interface DashboardFiltersProps {
  facturas: Factura[];
}

const PERIODO_LABELS: Record<PeriodoOption, string> = {
  todos: 'Todos los periodos',
  mes: 'Este mes',
  trimestre: 'Trimestre actual',
  anio: 'Este año',
  anio12: 'Últimos 12 meses',
};

const TIPO_LABELS: Record<TipoOption, string> = {
  todos: 'Todos',
  ingreso: 'Ingresos',
  gasto: 'Gastos',
};

const selectClass =
  'bg-bn-elevated border border-bn-hairline text-bn-body text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-bn-yellow/40 focus:border-bn-yellow transition-colors cursor-pointer';

export function DashboardFilters({ facturas }: DashboardFiltersProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const state: FilterState = parseFilters(searchParams);

  const clientes = Array.from(
    new Set(facturas.filter((f) => f.tipo === 'ingreso').map((f) => f.receptor)),
  ).sort();

  const presets = buildPresets();

  function applyPreset(preset: Preset) {
    const params = new URLSearchParams();
    params.set('desde', preset.desde);
    params.set('hasta', preset.hasta);
    if (state.tipo !== 'todos') params.set('tipo', state.tipo);
    if (state.cliente && state.tipo !== 'gasto') params.set('cliente', state.cliente);
    setSearchParams(params, { replace: true });
  }

  function isActivePreset(preset: Preset) {
    return state.desde === preset.desde && state.hasta === preset.hasta;
  }

  function update(patch: Partial<FilterState>) {
    const next = { ...state, ...patch };
    const params = new URLSearchParams();
    if (next.periodo !== 'todos') params.set('periodo', next.periodo);
    if (next.tipo !== 'todos') params.set('tipo', next.tipo);
    if (next.cliente && next.tipo !== 'gasto') params.set('cliente', next.cliente);
    // Carry over custom date range if set
    if (next.desde) params.set('desde', next.desde);
    if (next.hasta) params.set('hasta', next.hasta);
    setSearchParams(params, { replace: true });
  }

  const hasFilters = !isDefaultFilters(state);
  const clienteDisabled = state.tipo === 'gasto';

  return (
    <div className="bg-bn-card border border-bn-hairline rounded-xl px-4 py-3 flex flex-col gap-3 mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-bn-muted uppercase tracking-wide shrink-0 mr-1">
          Filtros rápidos
        </span>
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => applyPreset(preset)}
            className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
              isActivePreset(preset)
                ? 'bg-bn-yellow text-black border-bn-yellow'
                : 'border-bn-hairline text-bn-muted hover:border-bn-yellow hover:text-bn-yellow'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-semibold text-bn-muted uppercase tracking-wide shrink-0">
        Filtros
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
        <option value="">Todos los clientes</option>
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
          Limpiar filtros
        </button>
      )}
      </div>
    </div>
  );
}
