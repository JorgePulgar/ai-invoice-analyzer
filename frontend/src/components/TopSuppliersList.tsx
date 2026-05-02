import type { SupplierEntry } from '../types';
import { formatCurrency } from '../utils/format';

interface TopSuppliersListProps {
  suppliers: SupplierEntry[];
}

export function TopSuppliersList({ suppliers }: TopSuppliersListProps) {
  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline">
      <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide mb-4">
        Top Proveedores
      </h3>
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
                {supplier.num_facturas} {supplier.num_facturas === 1 ? 'invoice' : 'invoices'}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
