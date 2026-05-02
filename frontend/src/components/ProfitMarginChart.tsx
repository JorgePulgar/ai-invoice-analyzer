import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { MonthlyEntry } from '../types';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface ProfitMarginChartProps {
  data: MonthlyEntry[];
}

export function ProfitMarginChart({ data }: ProfitMarginChartProps) {
  const margins = data.map((d) =>
    d.ingresos > 0 ? ((d.ingresos - d.gastos) / d.ingresos) * 100 : null,
  );

  const chartData = {
    labels: data.map((d) => d.mes),
    datasets: [
      {
        label: 'Profit Margin',
        data: margins,
        borderColor: 'rgb(252, 213, 53)',
        backgroundColor: 'rgba(252, 213, 53, 0.1)',
        tension: 0.4,
        pointRadius: 3,
        borderWidth: 2,
        spanGaps: false,
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
            `Margin: ${ctx.parsed.y !== null ? ctx.parsed.y.toFixed(1) : '—'}%`,
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
          callback: (value: number | string) => `${Number(value).toFixed(0)}%`,
        },
        grid: { color: '#2B3139' },
        border: { color: '#2B3139' },
      },
    },
  };

  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline">
      <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide mb-4">
        Margen de beneficio mensual (%)
      </h3>
      <Line data={chartData} options={options} />
    </div>
  );
}
