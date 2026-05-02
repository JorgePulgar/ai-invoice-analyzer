import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { MonthlyChart } from '../components/MonthlyChart';
import { TopClientsList } from '../components/TopClientsList';
import { TopSuppliersList } from '../components/TopSuppliersList';
import { RevenueChart } from '../components/RevenueChart';
import { ExpenseCategoriesChart } from '../components/ExpenseCategoriesChart';
import { VatTable } from '../components/VatTable';
import { VatChart } from '../components/VatChart';
import { IrpfWidget } from '../components/IrpfWidget';
import { CashFlowChart } from '../components/CashFlowChart';
import { ProfitMarginChart } from '../components/ProfitMarginChart';
import { InsightsPanel } from '../components/InsightsPanel';
import { InvoiceHeatmap } from '../components/InvoiceHeatmap';
import { deriveInsights } from '../utils/insights';
import { FacturasTable } from '../components/FacturasTable';
import { DashboardFilters } from '../components/DashboardFilters';
import { AiSummaryCard } from '../components/AiSummaryCard';
import { api } from '../services/api';
import { formatCurrency, formatDate } from '../utils/format';
import {
  parseFilters,
  isDefaultFilters,
  applyFilters,
  deriveSummary,
  deriveMonthly,
  deriveClients,
  deriveVat,
  deriveSuppliers,
} from '../utils/filters';
import type { Summary, MonthlyEntry, ClientEntry, VatEntry, Factura, AiSummary, SupplierEntry } from '../types';

function calcTrend(monthly: MonthlyEntry[], key: 'ingresos' | 'gastos'): number | null {
  if (monthly.length < 6) return null;
  const recent = monthly.slice(-3).reduce((s, m) => s + m[key], 0);
  const prior = monthly.slice(-6, -3).reduce((s, m) => s + m[key], 0);
  if (prior === 0) return null;
  return ((recent - prior) / prior) * 100;
}

export function DashboardPage() {
  const [searchParams] = useSearchParams();

  // Server-provided data (unfiltered)
  const [serverSummary, setServerSummary] = useState<Summary | null>(null);
  const [serverMonthly, setServerMonthly] = useState<MonthlyEntry[]>([]);
  const [serverClients, setServerClients] = useState<ClientEntry[]>([]);
  const [serverVat, setServerVat] = useState<VatEntry[]>([]);
  const [serverSuppliers, setServerSuppliers] = useState<SupplierEntry[]>([]);
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
      api.getSuppliers(),
    ])
      .then(([s, m, c, v, f, ai, sup]) => {
        setServerSummary(s);
        setServerMonthly(m);
        setServerClients(c);
        setServerVat(v);
        setFacturasOriginal(f.facturas);
        setAiSummary(ai);
        setServerSuppliers(sup);
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

  // Filters are URL-driven. Derived analytics are memoised against the serialised
  // search-params string so any URL change reliably triggers a recompute. Without
  // this, child components could see stale derived data when only filter values
  // (not facturas) change between renders.
  const paramsKey = searchParams.toString();
  const filterState = useMemo(() => parseFilters(searchParams), [paramsKey, searchParams]);
  const filtersActive = useMemo(() => !isDefaultFilters(filterState), [filterState]);

  const filteredFacturas = useMemo(
    () => (filtersActive ? applyFilters(facturasOriginal, filterState) : facturasOriginal),
    [filtersActive, facturasOriginal, filterState],
  );

  const summary = useMemo(
    () => (filtersActive ? deriveSummary(filteredFacturas) : serverSummary),
    [filtersActive, filteredFacturas, serverSummary],
  );
  const monthly = useMemo(
    () => (filtersActive ? deriveMonthly(filteredFacturas) : serverMonthly),
    [filtersActive, filteredFacturas, serverMonthly],
  );
  const clients = useMemo(
    () => (filtersActive ? deriveClients(filteredFacturas) : serverClients),
    [filtersActive, filteredFacturas, serverClients],
  );
  const vat = useMemo(
    () => (filtersActive ? deriveVat(filteredFacturas) : serverVat),
    [filtersActive, filteredFacturas, serverVat],
  );
  const suppliers = useMemo(
    () => (filtersActive ? deriveSuppliers(filteredFacturas) : serverSuppliers),
    [filtersActive, filteredFacturas, serverSuppliers],
  );

  const ingresosTrend = calcTrend(monthly, 'ingresos');
  const gastosTrend = calcTrend(monthly, 'gastos');
  const insights = summary ? deriveInsights(summary, monthly, clients, suppliers) : [];

  const kpis = summary
    ? [
        {
          label: 'Total Income',
          value: formatCurrency(summary.ingresos_totales),
          tone: 'up' as const,
          trend: ingresosTrend !== null ? { pct: ingresosTrend } : undefined,
        },
        {
          label: 'Total Expenses',
          value: formatCurrency(summary.gastos_totales),
          tone: 'down' as const,
          trend: gastosTrend !== null ? { pct: gastosTrend } : undefined,
        },
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

      {summary && (
        <p className="inline-flex items-center gap-1 rounded-full bg-bn-card border border-bn-hairline px-3 py-1 text-xs text-bn-muted mb-4">
          Analizando: {formatDate(summary.periodo.desde)} → {formatDate(summary.periodo.hasta)}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} tone={kpi.tone} trend={kpi.trend} />
        ))}
      </div>

      {filteredFacturas.length === 0 && filtersActive ? (
        <div className="bg-bn-card rounded-xl border border-bn-hairline px-6 py-16 text-center mb-6">
          <p className="text-bn-muted">No invoices match the selected filters.</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <MonthlyChart data={monthly} forecast={!filtersActive} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <TopClientsList clients={clients} />
            <TopSuppliersList suppliers={suppliers} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <RevenueChart clients={clients} />
            <ExpenseCategoriesChart facturas={filteredFacturas} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2">
              <VatChart vat={vat} />
            </div>
            {summary && <IrpfWidget amount={summary.irpf_retenido} />}
          </div>

          <div className="mb-6">
            <VatTable vat={vat} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <CashFlowChart data={monthly} />
            <ProfitMarginChart data={monthly} />
          </div>

          <InsightsPanel insights={insights} />

          <InvoiceHeatmap facturas={filteredFacturas} />
        </>
      )}

      <FacturasTable facturas={filteredFacturas} onDelete={handleDelete} />
    </Layout>
  );
}
