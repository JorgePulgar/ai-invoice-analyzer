import { useSearchParams } from 'react-router-dom';
import type { FilterState } from '../utils/filters';

interface ActiveFiltersBarProps {
  state: FilterState;
}

interface Chip {
  label: string;
  removeKey: string | string[];
}

const PERIODO_LABELS: Record<string, string> = {
  mes: 'Este mes',
  trimestre: 'Trimestre actual',
  anio: 'Este año',
  anio12: 'Últimos 12 meses',
};

const TIPO_LABELS: Record<string, string> = {
  ingreso: 'Tipo: Ingresos',
  gasto: 'Tipo: Gastos',
};

export function ActiveFiltersBar({ state }: ActiveFiltersBarProps) {
  const [searchParams, setSearchParams] = useSearchParams();

  const chips: Chip[] = [];

  if (state.periodo !== 'todos') {
    chips.push({ label: PERIODO_LABELS[state.periodo] ?? state.periodo, removeKey: 'periodo' });
  }
  if (state.tipo !== 'todos') {
    chips.push({ label: TIPO_LABELS[state.tipo] ?? state.tipo, removeKey: 'tipo' });
  }
  if (state.cliente) {
    chips.push({ label: `Cliente: ${state.cliente}`, removeKey: 'cliente' });
  }
  if (state.desde || state.hasta) {
    const label = [state.desde, state.hasta].filter(Boolean).join(' → ');
    chips.push({ label: `Periodo: ${label}`, removeKey: ['desde', 'hasta'] });
  }

  if (chips.length === 0) return null;

  const removeChip = (keys: string | string[]) => {
    const params = new URLSearchParams(searchParams);
    (Array.isArray(keys) ? keys : [keys]).forEach((k) => params.delete(k));
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-2">
      <span className="text-xs text-bn-muted">Activos:</span>
      {chips.map((chip) => (
        <span
          key={Array.isArray(chip.removeKey) ? chip.removeKey.join(',') : chip.removeKey}
          className="inline-flex items-center gap-1.5 bg-bn-elevated border border-bn-hairline rounded-full px-3 py-1 text-xs text-bn-body"
        >
          {chip.label}
          <button
            onClick={() => removeChip(chip.removeKey)}
            aria-label={`Quitar filtro: ${chip.label}`}
            className="text-bn-muted hover:text-bn-down transition-colors leading-none"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
