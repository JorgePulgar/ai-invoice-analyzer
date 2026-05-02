import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  LineController,
  BarController,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartDataset, TooltipItem } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import type { MonthlyEntry } from '../types';
import { formatCurrency } from '../utils/format';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  LineController,
  BarController,
  Tooltip,
  Legend,
);

interface MonthlyChartProps {
  data: MonthlyEntry[];
  forecast?: boolean;
}

export function MonthlyChart({ data, forecast = false }: MonthlyChartProps) {
  const displayData = forecast ? addForecast(data) : data;

  const barDataset: ChartDataset<'bar'> = {
    type: 'bar',
    label: 'Ingresos',
    data: displayData.map((d) => d.ingresos),
    backgroundColor: 'rgba(14, 203, 129, 0.65)',
    borderColor: '#0ECB81',
    borderWidth: 1,
    borderRadius: 4,
  };

  const expenseDataset: ChartDataset<'bar'> = {
    type: 'bar',
    label: 'Gastos',
    data: displayData.map((d) => d.gastos),
    backgroundColor: 'rgba(246, 70, 93, 0.65)',
    borderColor: '#F6465D',
    borderWidth: 1,
    borderRadius: 4,
  };

  const profitDataset: ChartDataset<'line'> = {
    type: 'line',
    label: 'Beneficio neto',
    data: displayData.map((d) => d.ingresos - d.gastos),
    borderColor: 'rgb(252, 213, 53)',
    backgroundColor: 'rgba(252, 213, 53, 0.1)',
    tension: 0.4,
    pointRadius: 3,
    borderWidth: 2,
    yAxisID: 'y',
  };

  const chartData = {
    labels: displayData.map((d, i) => {
      const isForecast = forecast && i >= data.length;
      return isForecast ? `${d.mes}*` : d.mes;
    }),
    datasets: [
      barDataset,
      expenseDataset,
      profitDataset as unknown as ChartDataset<'bar'>,
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
            `${ctx.dataset.label ?? ''}: ${formatCurrency(ctx.parsed.y ?? 0)}`,
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
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline hover:shadow-lg transition-shadow duration-200">
      <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide mb-4">
        Evolución mensual
      </h3>
      <Chart type="bar" data={chartData} options={options} />
    </div>
  );
}

function addForecast(data: MonthlyEntry[]): MonthlyEntry[] {
  if (data.length < 3) return data;
  const last3 = data.slice(-3);
  const avgIngresos = last3.reduce((s, m) => s + m.ingresos, 0) / 3;
  const avgGastos = last3.reduce((s, m) => s + m.gastos, 0) / 3;
  const lastMes = data[data.length - 1].mes;
  const synthetic: MonthlyEntry[] = [];
  for (let i = 1; i <= 3; i++) {
    synthetic.push({ mes: addMonths(lastMes, i), ingresos: avgIngresos, gastos: avgGastos });
  }
  return [...data, ...synthetic];
}

function addMonths(yyyyMm: string, n: number): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
