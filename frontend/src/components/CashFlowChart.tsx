import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ScriptableLineSegmentContext, TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { MonthlyEntry } from '../types';
import { formatCurrency } from '../utils/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface CashFlowChartProps {
  data: MonthlyEntry[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const cashFlow = data.map((d) => d.ingresos - d.gastos);

  const chartData = {
    labels: data.map((d) => d.mes),
    datasets: [
      {
        label: 'Cash Flow',
        data: cashFlow,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        borderWidth: 2,
        segment: {
          borderColor: (ctx: ScriptableLineSegmentContext) =>
            ctx.p1.parsed.y >= 0 ? '#0ECB81' : '#F6465D',
          backgroundColor: (ctx: ScriptableLineSegmentContext) =>
            ctx.p1.parsed.y >= 0 ? 'rgba(14,203,129,0.15)' : 'rgba(246,70,93,0.15)',
        },
        borderColor: 'rgb(14, 203, 129)',
        backgroundColor: 'rgba(14, 203, 129, 0.15)',
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'line'>) =>
            `Cash Flow: ${formatCurrency(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#707A8A', font: { size: 11 } },
        grid: { color: '#2B3139' },
        border: { color: '#2B3139' },
      },
      y: {
        ticks: {
          color: '#707A8A',
          font: { size: 11 },
          callback: (value: number | string) => formatCurrency(Number(value)),
        },
        grid: { color: '#2B3139' },
        border: { color: '#2B3139' },
      },
    },
  };

  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline">
      <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide mb-4">
        Flujo de caja mensual
      </h3>
      <Line data={chartData} options={options} />
    </div>
  );
}
