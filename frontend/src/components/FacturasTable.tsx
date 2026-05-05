import type { Factura } from '../types';
import { TipoBadge } from './TipoBadge';
import { formatCurrency, formatDate } from '../utils/format';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useToast } from '../context/ToastContext';
import { EmptyState } from './EmptyState';
import { Link } from 'react-router-dom';

interface FacturasTableProps {
  facturas: Factura[];
  onDelete: (id: number) => Promise<void>;
}

export function FacturasTable({ facturas, onDelete }: FacturasTableProps) {
  const { ref, revealClass } = useScrollReveal({ threshold: 0.1 });
  const { success, error } = useToast();

  const handleDelete = async (id: number, numero: string) => {
    if (!window.confirm(`¿Eliminar factura ${numero}?`)) return;
    try {
      await onDelete(id);
      success('Factura eliminada');
    } catch (err) {
      error(err instanceof Error ? err.message : 'No se pudo eliminar la factura');
    }
  };

  return (
    <div
      ref={ref}
      className={`bg-bn-card rounded-xl border border-bn-hairline overflow-hidden ${revealClass}`}
    >
      <div className="px-6 py-4 border-b border-bn-hairline">
        <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide">Facturas</h3>
      </div>

      {facturas.length === 0 ? (
        <EmptyState
          icon="🧾"
          title="No hay facturas"
          description="Sube tu primera factura para empezar a ver tus datos financieros."
          cta={
            <Link
              to="/upload"
              className="text-sm font-semibold bg-bn-yellow text-bn-ink px-5 py-2 rounded-lg hover:bg-bn-yellow-hover transition-colors"
            >
              Subir factura
            </Link>
          }
        />
      ) : (
        <>
          {/* Mobile cards (< md) */}
          <ul className="md:hidden divide-y divide-bn-hairline">
            {facturas.map((f) => (
              <li key={f.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-bn-body truncate">{f.numero}</span>
                    <TipoBadge tipo={f.tipo} />
                  </div>
                  <p className="text-xs text-bn-muted truncate">{f.emisor}</p>
                  <p className="text-xs text-bn-muted">{formatDate(f.fecha)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-bold ${f.tipo === 'ingreso' ? 'text-bn-up' : 'text-bn-down'}`}>
                    {formatCurrency(f.total, f.moneda)}
                  </p>
                  <button
                    onClick={() => handleDelete(f.id, f.numero)}
                    aria-label={`Eliminar factura ${f.numero}`}
                    className="text-xs text-bn-muted hover:text-bn-down transition-colors font-medium mt-1"
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop table (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bn-elevated">
                <tr className="text-xs text-bn-muted uppercase">
                  <th className="text-left px-6 py-3 font-medium">Número</th>
                  <th className="text-left px-6 py-3 font-medium">Fecha</th>
                  <th className="text-left px-6 py-3 font-medium">Emisor</th>
                  <th className="text-left px-6 py-3 font-medium">Receptor</th>
                  <th className="text-right px-6 py-3 font-medium">Total</th>
                  <th className="text-left px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-bn-hairline">
                {facturas.map((f) => (
                  <tr
                    key={f.id}
                    className={`hover:bg-bn-elevated transition-colors border-l-2 ${
                      f.tipo === 'ingreso' ? 'border-l-bn-up/40' : 'border-l-bn-down/40'
                    }`}
                  >
                    <td className="px-6 py-3 font-medium text-bn-body">{f.numero}</td>
                    <td className="px-6 py-3 text-bn-muted-strong">{formatDate(f.fecha)}</td>
                    <td className="px-6 py-3 text-bn-muted-strong max-w-[160px] truncate">{f.emisor}</td>
                    <td className="px-6 py-3 text-bn-muted-strong max-w-[160px] truncate">{f.receptor}</td>
                    <td className={`px-6 py-3 text-right font-semibold ${
                      f.tipo === 'ingreso' ? 'text-bn-up' : 'text-bn-down'
                    }`}>
                      {formatCurrency(f.total, f.moneda)}
                    </td>
                    <td className="px-6 py-3">
                      <TipoBadge tipo={f.tipo} />
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDelete(f.id, f.numero)}
                        aria-label={`Eliminar factura ${f.numero}`}
                        className="text-xs text-bn-muted hover:text-bn-down transition-colors font-medium"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
