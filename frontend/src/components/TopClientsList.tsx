import type { ClientEntry } from '../types';
import { formatCurrency } from '../utils/format';

interface TopClientsListProps {
  clients: ClientEntry[];
}

export function TopClientsList({ clients }: TopClientsListProps) {
  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline h-full">
      <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide mb-4">
        Top Clientes
      </h3>
      <ol className="space-y-1">
        {clients.map((client, i) => (
          <li
            key={client.cliente}
            className="flex items-center justify-between py-2.5 border-b border-bn-hairline last:border-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-bold text-bn-muted w-4 shrink-0">{i + 1}</span>
              <span className="text-sm text-bn-body truncate">{client.cliente}</span>
            </div>
            <div className="text-right ml-4 shrink-0">
              <p className="text-sm font-semibold text-bn-up flex items-center justify-end gap-1">
                <span className="text-[10px]">▲</span>
                {formatCurrency(client.facturado)}
              </p>
              <p className="text-xs text-bn-muted">
                {client.num_facturas} {client.num_facturas === 1 ? 'factura' : 'facturas'}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
