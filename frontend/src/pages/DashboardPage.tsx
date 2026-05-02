import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { MonthlyChart } from '../components/MonthlyChart';
import { TopClientsList } from '../components/TopClientsList';
import { VatTable } from '../components/VatTable';
import { FacturasTable } from '../components/FacturasTable';
import { DashboardFilters } from '../components/DashboardFilters';
import { AiSummaryCard } from '../components/AiSummaryCard';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';
import {
  parseFilters,
  isDefaultFilters,
  applyFilters,
  deriveSummary,
  deriveMonthly,
  deriveClients,
  deriveVat,
} from '../utils/filters';
import type { Summary, MonthlyEntry, ClientEntry, VatEntry, Factura, AiSummary } from '../types';

export function DashboardPage() {
  const [searchParams] = useSearchParams();

  // Server-provided data (unfiltered)
  const [serverSummary, setServerSummary] = useState<Summary | null>(null);
  const [serverMonthly, setServerMonthly] = useState<MonthlyEntry[]>([]);
  const [serverClients, setServerClients] = useState<ClientEntry[]>([]);
  const [serverVat, setServerVat] = useState<VatEntry[]>([]);
  const [facturasOriginal, setFacturasOriginal] = useState<Factura[]>([]);
  const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getSummary(),
      api.getMonthly(),
      api.getClients(),
      api.getVat(),
      api.listFacturas(),
      api.getAiSummary(),
    ])
      .then(([s, m, c, v, f, ai]) => {
        setServerSummary(s);
        setServerMonthly(m);
        setServerClients(c);
        setServerVat(v);
        setFacturasOriginal(f.facturas);
        setAiSummary(ai);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error loading data');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await api.deleteFactura(id);
      const result = await api.listFacturas();
      setFacturasOriginal(result.facturas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting invoice');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-bn-muted">Loading…</p>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <p className="text-bn-down mt-4">{error}</p>
      </Layout>
    );
  }

  // Apply filters
  const filterState = parseFilters(searchParams);
  const filtersActive = !isDefaultFilters(filterState);

  const filteredFacturas = filtersActive
    ? applyFilters(facturasOriginal, filterState)
    : facturasOriginal;

  const summary = filtersActive ? deriveSummary(filteredFacturas) : serverSummary;
  const monthly = filtersActive ? deriveMonthly(filteredFacturas) : serverMonthly;
  const clients = filtersActive ? deriveClients(filteredFacturas) : serverClients;
  const vat = filtersActive ? deriveVat(filteredFacturas) : serverVat;

  const kpis = summary
    ? [
        { label: 'Total Income', value: formatCurrency(summary.ingresos_totales), tone: 'up' as const },
        { label: 'Total Expenses', value: formatCurrency(summary.gastos_totales), tone: 'down' as const },
        {
          label: 'Net Profit',
          value: formatCurrency(summary.beneficio_neto),
          tone: (summary.beneficio_neto >= 0 ? 'up' : 'down') as 'up' | 'down',
        },
        { label: 'VAT Due', value: formatCurrency(summary.iva_a_pagar), tone: 'neutral' as const },
        { label: 'IRPF Retenido', value: formatCurrency(summary.irpf_retenido), tone: 'neutral' as const },
        { label: 'Ticket Medio', value: formatCurrency(summary.ticket_medio), tone: 'neutral' as const },
        { label: 'Num. Facturas', value: String(summary.num_facturas), tone: 'neutral' as const },
      ]
    : [];

  return (
    <Layout>
      <AiSummaryCard summary={aiSummary} loading={false} />
      <DashboardFilters facturas={facturasOriginal} />

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} tone={kpi.tone} />
        ))}
      </div>

      {filteredFacturas.length === 0 && filtersActive ? (
        <div className="bg-bn-card rounded-xl border border-bn-hairline px-6 py-16 text-center mb-6">
          <p className="text-bn-muted">No invoices match the selected filters.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <MonthlyChart data={monthly} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <TopClientsList clients={clients} />
            <VatTable vat={vat} />
          </div>
        </>
      )}

      <FacturasTable facturas={filteredFacturas} onDelete={handleDelete} />
    </Layout>
  );
}
