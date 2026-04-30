import { Layout } from '../components/Layout';

export function DashboardPage() {
  // TODO: fetch summary, monthly, clients, vat, listFacturas in parallel
  // (useEffect + Promise.all). Render KpiCard, MonthlyChart, TopClientsList,
  // VatTable, FacturasTable. Wire delete handler to api.deleteFactura
  // and re-fetch on success.
  return (
    <Layout>
      <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
      <p className="text-slate-500 text-sm">TODO: implement dashboard sections</p>
    </Layout>
  );
}
