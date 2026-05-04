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
import { InfoTooltip } from './InfoTooltip';
import { useChartColors } from '../utils/useChartColors';
import { useScrollReveal } from '../hooks/useScrollReveal';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface CashFlowChartProps {
  data: MonthlyEntry[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const { ref, revealClass } = useScrollReveal({ threshold: 0.1 });
  const cc = useChartColors();
  const cashFlow = data.map((d) => d.ingresos - d.gastos);

  const chartData = {
    labels: data.map((d) => d.mes),
    datasets: [
      {
        label: 'Flujo de caja',
        data: cashFlow,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        borderWidth: 2,
        segment: {
          borderColor: (ctx: ScriptableLineSegmentContext) =>
            (ctx.p1.parsed.y ?? 0) >= 0 ? '#0ECB81' : '#F6465D',
          backgroundColor: (ctx: ScriptableLineSegmentContext) =>
            (ctx.p1.parsed.y ?? 0) >= 0 ? 'rgba(14,203,129,0.15)' : 'rgba(246,70,93,0.15)',
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
            `Flujo de caja: ${formatCurrency(ctx.parsed.y ?? 0)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: cc.tick, font: { size: 11 } },
        grid: { color: cc.grid },
        border: { color: cc.border },
      },
      y: {
        ticks: {
          color: cc.tick,
          font: { size: 11 },
          callback: (value: number | string) => formatCurrency(Number(value)),
        },
        grid: { color: cc.grid },
        border: { color: cc.border },
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
          Flujo de caja mensual
        </h3>
        <InfoTooltip text="Diferencia neta entre ingresos y gastos mes a mes. Valores positivos indican meses con superávit; negativos, meses con déficit de tesorería." />
      </div>
      <Line data={chartData} options={options} />
    </div>
  );
}
