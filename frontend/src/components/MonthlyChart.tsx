import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import type { MonthlyEntry } from '../types';
import { formatCurrency } from '../utils/format';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface MonthlyChartProps {
  data: MonthlyEntry[];
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const chartData = {
    labels: data.map((d) => d.mes),
    datasets: [
      {
        label: 'Ingresos',
        data: data.map((d) => d.ingresos),
        backgroundColor: 'rgba(14, 203, 129, 0.65)',
        borderColor: '#0ECB81',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Gastos',
        data: data.map((d) => d.gastos),
        backgroundColor: 'rgba(246, 70, 93, 0.65)',
        borderColor: '#F6465D',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: '#EAECEF', font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'bar'>) =>
            `${ctx.dataset.label ?? ''}: ${formatCurrency(ctx.parsed.y)}`,
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
        Evolución mensual
      </h3>
      <Bar data={chartData} options={options} />
    </div>
  );
}
