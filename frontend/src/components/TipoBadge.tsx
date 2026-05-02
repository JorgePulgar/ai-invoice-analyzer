import type { Tipo } from '../types';

interface TipoBadgeProps {
  tipo: Tipo;
  size?: 'sm' | 'md';
}

export function TipoBadge({ tipo, size = 'sm' }: TipoBadgeProps) {
  const isIngreso = tipo === 'ingreso';
  const sizeClasses = size === 'md' ? 'text-sm px-3 py-1' : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClasses} ${
        isIngreso
          ? 'bg-bn-up/10 text-bn-up'
          : 'bg-bn-down/10 text-bn-down'
      }`}
    >
      <span className="text-[10px]">{isIngreso ? '▲' : '▼'}</span>
      {isIngreso ? 'Ingreso' : 'Gasto'}
    </span>
  );
}
