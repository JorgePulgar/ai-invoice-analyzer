import type { ClientEntry } from '../types';
import { formatCurrency } from '../utils/format';
import { InfoTooltip } from './InfoTooltip';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { EmptyState } from './EmptyState';

interface TopClientsListProps {
  clients: ClientEntry[];
}

export function TopClientsList({ clients }: TopClientsListProps) {
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
          Top Clientes
        </h3>
        <InfoTooltip text="Clientes que más te han facturado en el periodo, ordenados por importe total. Solo incluye facturas de ingreso." />
      </div>
      {clients.length === 0 ? (
        <EmptyState icon="👤" title="Sin clientes" description="No hay facturas de ingreso en el periodo." compact />
      ) : (
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
      )}
    </div>
  );
}
