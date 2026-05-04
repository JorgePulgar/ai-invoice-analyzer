import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { AlertsBanner } from '../components/AlertsBanner';
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
  const navigate = useNavigate();

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
        setError(err instanceof Error ? err.message : 'Error al cargar los datos');
      })
      .finally(() => setLoading(false));
  }, []);

  // Filters are URL-driven. Derived analytics are memoised against the serialised
  // search-params string so any URL change reliably triggers a recompute.
  // All useMemo calls must be before any conditional return (Rules of Hooks).
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

  const handleDelete = async (id: number) => {
    try {
      await api.deleteFactura(id);
      const result = await api.listFacturas();
      setFacturasOriginal(result.facturas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar la factura');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-bn-muted">Cargando…</p>
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

  const ingresosTrend = calcTrend(monthly, 'ingresos');
  const gastosTrend = calcTrend(monthly, 'gastos');
  const insights = summary ? deriveInsights(summary, monthly, clients, suppliers) : [];

  const kpis = summary
    ? [
        {
          label: 'Ingresos totales',
          value: formatCurrency(summary.ingresos_totales),
          tone: 'up' as const,
          trend: ingresosTrend !== null ? { pct: ingresosTrend } : undefined,
          info: 'Suma de los importes totales de todas las facturas emitidas (ingresos) en el periodo seleccionado.',
        },
        {
          label: 'Gastos totales',
          value: formatCurrency(summary.gastos_totales),
          tone: 'down' as const,
          trend: gastosTrend !== null ? { pct: gastosTrend } : undefined,
          info: 'Suma de los importes totales de todas las facturas recibidas (gastos) en el periodo seleccionado.',
        },
        {
          label: 'Beneficio neto',
          value: formatCurrency(summary.beneficio_neto),
          tone: (summary.beneficio_neto >= 0 ? 'up' : 'down') as 'up' | 'down',
          info: 'Ingresos totales menos gastos totales. Refleja el beneficio antes de impuestos del periodo.',
        },
        {
          label: 'IVA a pagar',
          value: formatCurrency(summary.iva_a_pagar),
          tone: 'neutral' as const,
          info: 'IVA repercutido (cobrado a clientes) menos IVA soportado (pagado a proveedores). Es el importe que debes declarar a Hacienda.',
        },
        {
          label: 'IRPF retenido',
          value: formatCurrency(summary.irpf_retenido),
          tone: 'neutral' as const,
          info: 'Suma del IRPF retenido por tus clientes en facturas de ingreso. Ellos lo ingresan a Hacienda en tu nombre.',
        },
        {
          label: 'Ticket medio',
          value: formatCurrency(summary.ticket_medio),
          tone: 'neutral' as const,
          info: 'Importe medio por factura de ingreso en el periodo. Útil para comparar entre periodos o con la media del sector.',
        },
        {
          label: 'Num. facturas',
          value: String(summary.num_facturas),
          tone: 'neutral' as const,
          info: 'Número total de facturas registradas (ingresos y gastos) en el periodo seleccionado.',
        },
      ]
    : [];

  return (
    <Layout>
      {/* Print-only header — hidden on screen via Tailwind's hidden class */}
      {summary && (
        <div className="hidden print:block mb-6 pb-4 border-b border-bn-hairline">
          <p className="text-lg font-bold text-bn-body">Invoice Insights — Resumen financiero</p>
          <p className="text-xs text-bn-muted mt-1">
            Periodo: {formatDate(summary.periodo.desde)} → {formatDate(summary.periodo.hasta)}
            {' · '}Generado el {formatDate(new Date().toISOString().slice(0, 10))}
          </p>
        </div>
      )}

      <AiSummaryCard summary={aiSummary} loading={false} />
      <AlertsBanner summary={summary} vat={vat} clients={clients} />
      <div data-print-hide>
        <DashboardFilters facturas={facturasOriginal} />
      </div>

      {summary && summary.periodo.desde && (
        <div className="flex items-center justify-between gap-4 mb-4" data-print-hide>
          <p className="inline-flex items-center gap-1 rounded-full bg-bn-card border border-bn-hairline px-3 py-1 text-xs text-bn-muted">
            Analizando: {formatDate(summary.periodo.desde)} → {formatDate(summary.periodo.hasta)}
          </p>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full bg-bn-yellow text-bn-ink px-3 py-1.5 text-xs font-semibold hover:bg-bn-yellow-hover transition-colors"
          >
            ↓ Exportar PDF
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-4 mb-6 kpi-grid">
        {kpis.map((kpi, i) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            tone={kpi.tone}
            trend={kpi.trend}
            info={kpi.info}
            style={{ animationDelay: `${i * 75}ms` }}
          />
        ))}
      </div>

      {filteredFacturas.length === 0 && filtersActive ? (
        <div className="bg-bn-card rounded-xl border border-bn-hairline px-6 py-20 text-center mb-6 flex flex-col items-center gap-4">
          <span className="text-4xl opacity-40">🔍</span>
          <p className="text-bn-body font-semibold">Sin resultados para este periodo</p>
          <p className="text-bn-muted text-sm max-w-sm">
            Los filtros activos no devuelven facturas. Prueba con un rango de fechas diferente o limpia los filtros para ver todos los datos.
          </p>
          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="mt-2 text-sm font-semibold bg-bn-yellow text-bn-ink px-5 py-2 rounded-lg hover:bg-bn-yellow-hover transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <MonthlyChart data={monthly} forecast={!filtersActive} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <TopClientsList clients={clients} />
            <TopSuppliersList suppliers={suppliers} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <RevenueChart clients={clients} />
            <ExpenseCategoriesChart facturas={filteredFacturas} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2">
              <VatChart vat={vat} />
            </div>
            {summary && <IrpfWidget amount={summary.irpf_retenido} />}
          </div>

          <div className="mb-6">
            <VatTable vat={vat} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <CashFlowChart data={monthly} />
            <ProfitMarginChart data={monthly} />
          </div>

          <div data-print-hide>
            <InsightsPanel insights={insights} />
          </div>

          <div data-print-hide>
            <InvoiceHeatmap facturas={filteredFacturas} />
          </div>
        </>
      )}

      <div data-print-hide>
        <FacturasTable facturas={filteredFacturas} onDelete={handleDelete} />
      </div>
    </Layout>
  );
}
