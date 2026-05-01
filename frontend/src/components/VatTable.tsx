import type { VatEntry } from '../types';
import { formatCurrency } from '../utils/format';

interface VatTableProps {
  vat: VatEntry[];
}

export function VatTable({ vat }: VatTableProps) {
  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline">
      <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide mb-4">
        IVA trimestral
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-bn-muted uppercase">
            <th className="text-left pb-3 font-medium">Trimestre</th>
            <th className="text-right pb-3 font-medium">Repercutido</th>
            <th className="text-right pb-3 font-medium">Soportado</th>
            <th className="text-right pb-3 font-medium">A pagar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-bn-hairline">
          {vat.map((row) => (
            <tr key={`${row.trimestre}-${row.anio}`}>
              <td className="py-3 font-medium text-bn-body">
                {row.trimestre} {row.anio}
              </td>
              <td className="py-3 text-right text-bn-up">{formatCurrency(row.iva_repercutido)}</td>
              <td className="py-3 text-right text-bn-down">{formatCurrency(row.iva_soportado)}</td>
              <td className="py-3 text-right font-semibold text-bn-yellow">
                {formatCurrency(row.iva_a_pagar)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
