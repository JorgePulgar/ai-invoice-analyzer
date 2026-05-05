import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { ClientEntry } from '../types';
import { formatCurrency } from '../utils/format';
import { InfoTooltip } from './InfoTooltip';
import { useChartColors } from '../utils/useChartColors';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { EmptyState } from './EmptyState';

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
  const { ref, revealClass } = useScrollReveal({ threshold: 0.1 });
  const cc = useChartColors();

  if (clients.length === 0) {
    return (
      <div ref={ref} className={`bg-bn-card rounded-xl p-6 border border-bn-hairline ${revealClass}`}>
        <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide mb-2">Ingresos por cliente</h3>
        <EmptyState icon="🥧" title="Sin ingresos" description="No hay facturas de ingreso en el periodo." compact />
      </div>
    );
  }

  const chartData = {
    labels: clients.map((c) => c.cliente),
    datasets: [
      {
        data: clients.map((c) => c.facturado),
        backgroundColor: clients.map((_, i) => PALETTE[i % PALETTE.length]),
        borderColor: cc.doughnutBorder,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: cc.legend,
          font: { size: 11 },
          boxWidth: 12,
          padding: 12,
          formatter: (item: any) => {
            const value = chartData.datasets[0].data[item.index];
            return `${item.text}: ${formatCurrency(value as number)}`;
          },
        },
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
    <div
      ref={ref}
      className={`bg-bn-card rounded-xl p-6 border border-bn-hairline hover:shadow-lg transition-shadow duration-200 ${
        revealClass
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide">
          Ingresos por cliente
        </h3>
        <InfoTooltip text="Reparto porcentual de tus ingresos totales entre clientes. Permite identificar dependencias de un solo cliente." />
      </div>
      <Doughnut data={chartData} options={options} />
      <div className="hidden print:block mt-4 text-xs space-y-1">
        {clients.map((c, i) => (
          <div key={c.cliente} className="flex items-center gap-2">
            <span
              style={{ background: PALETTE[i % PALETTE.length] }}
              className="w-3 h-3 rounded-sm shrink-0"
            />
            <span>{c.cliente}: {formatCurrency(c.facturado)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
