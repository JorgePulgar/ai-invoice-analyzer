import type { Factura } from '../types';
import { TipoBadge } from './TipoBadge';
import { formatCurrency, formatDate } from '../utils/format';

interface FacturasTableProps {
  facturas: Factura[];
  onDelete: (id: number) => void;
}

export function FacturasTable({ facturas, onDelete }: FacturasTableProps) {
  const handleDelete = (id: number, numero: string) => {
    if (window.confirm(`Delete invoice ${numero}?`)) {
      onDelete(id);
    }
  };

  return (
    <div className="bg-bn-card rounded-xl border border-bn-hairline overflow-hidden">
      <div className="px-6 py-4 border-b border-bn-hairline">
        <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide">Invoices</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bn-elevated">
            <tr className="text-xs text-bn-muted uppercase">
              <th className="text-left px-6 py-3 font-medium">Number</th>
              <th className="text-left px-6 py-3 font-medium">Date</th>
              <th className="text-left px-6 py-3 font-medium">Issuer</th>
              <th className="text-left px-6 py-3 font-medium">Recipient</th>
              <th className="text-right px-6 py-3 font-medium">Total</th>
              <th className="text-left px-6 py-3 font-medium">Type</th>
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
                    className="text-xs text-bn-muted hover:text-bn-down transition-colors font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
