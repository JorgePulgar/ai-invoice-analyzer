import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { ClientEntry } from '../types';
import { formatCurrency } from '../utils/format';

ChartJS.register(ArcElement, Tooltip, Legend);

const PALETTE = [
  'rgb(252, 213, 53)',
  'rgb(14, 203, 129)',
  'rgb(246, 70, 93)',
  'rgb(113, 128, 150)',
  'rgb(160, 174, 192)',
  'rgb(203, 213, 224)',
  'rgb(72, 187, 120)',
];

interface RevenueChartProps {
  clients: ClientEntry[];
}

export function RevenueChart({ clients }: RevenueChartProps) {
  if (clients.length === 0) {
    return (
      <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline flex items-center justify-center min-h-[200px]">
        <p className="text-bn-muted text-sm">Sin datos de ingresos.</p>
      </div>
    );
  }

  const chartData = {
    labels: clients.map((c) => c.cliente),
    datasets: [
      {
        data: clients.map((c) => c.facturado),
        backgroundColor: clients.map((_, i) => PALETTE[i % PALETTE.length]),
        borderColor: '#1E2329',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#EAECEF', font: { size: 11 }, boxWidth: 12, padding: 12 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'doughnut'>) =>
            ` ${ctx.label}: ${formatCurrency(ctx.parsed)}`,
        },
      },
    },
  };

  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline">
      <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide mb-4">
        Ingresos por cliente
      </h3>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
