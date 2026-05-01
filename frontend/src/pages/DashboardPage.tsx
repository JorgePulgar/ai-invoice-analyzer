import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { KpiCard } from '../components/KpiCard';
import { MonthlyChart } from '../components/MonthlyChart';
import { TopClientsList } from '../components/TopClientsList';
import { VatTable } from '../components/VatTable';
import { FacturasTable } from '../components/FacturasTable';
import { api } from '../services/api';
import { formatCurrency } from '../utils/format';
import type { Summary, MonthlyEntry, ClientEntry, VatEntry, Factura } from '../types';

export function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [monthly, setMonthly] = useState<MonthlyEntry[]>([]);
  const [clients, setClients] = useState<ClientEntry[]>([]);
  const [vat, setVat] = useState<VatEntry[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.getSummary(),
      api.getMonthly(),
      api.getClients(),
      api.getVat(),
      api.listFacturas(),
    ])
      .then(([s, m, c, v, f]) => {
        setSummary(s);
        setMonthly(m);
        setClients(c);
        setVat(v);
        setFacturas(f.facturas);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await api.deleteFactura(id);
      const result = await api.listFacturas();
      setFacturas(result.facturas);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar factura');
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

  const kpis = summary
    ? [
        { label: 'Ingresos totales', value: formatCurrency(summary.ingresos_totales) },
        { label: 'Gastos totales', value: formatCurrency(summary.gastos_totales) },
        { label: 'Beneficio neto', value: formatCurrency(summary.beneficio_neto) },
        { label: 'IVA a pagar', value: formatCurrency(summary.iva_a_pagar) },
      ]
    : [];

  return (
    <Layout>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} />
        ))}
      </div>

      <div className="mb-6">
        <MonthlyChart data={monthly} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <TopClientsList clients={clients} />
        <VatTable vat={vat} />
      </div>

      <FacturasTable facturas={facturas} onDelete={handleDelete} />
    </Layout>
  );
}
