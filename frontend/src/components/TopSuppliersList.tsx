import type { SupplierEntry } from '../types';
import { formatCurrency } from '../utils/format';
import { InfoTooltip } from './InfoTooltip';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { EmptyState } from './EmptyState';

interface TopSuppliersListProps {
  suppliers: SupplierEntry[];
}

export function TopSuppliersList({ suppliers }: TopSuppliersListProps) {
  const { ref, revealClass } = useScrollReveal({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`bg-bn-card rounded-xl p-6 border border-bn-hairline h-full ${
        revealClass
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide">
          Top Proveedores
        </h3>
        <InfoTooltip text="Proveedores a los que más has pagado en el periodo, ordenados por importe total. Solo incluye facturas de gasto." />
      </div>
      {suppliers.length === 0 ? (
        <EmptyState icon="🏢" title="Sin proveedores" description="No hay facturas de gasto en el periodo." compact />
      ) : (
        <ol className="space-y-1">
          {suppliers.map((supplier, i) => (
            <li
              key={supplier.proveedor}
              className="flex items-center justify-between py-2.5 border-b border-bn-hairline last:border-0"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-bold text-bn-muted w-4 shrink-0">{i + 1}</span>
                <span className="text-sm text-bn-body truncate">{supplier.proveedor}</span>
              </div>
              <div className="text-right ml-4 shrink-0">
                <p className="text-sm font-semibold text-bn-down flex items-center justify-end gap-1">
                  <span className="text-[10px]">▼</span>
                  {formatCurrency(supplier.gastado)}
                </p>
                <p className="text-xs text-bn-muted">
                  {supplier.num_facturas} {supplier.num_facturas === 1 ? 'factura' : 'facturas'}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
