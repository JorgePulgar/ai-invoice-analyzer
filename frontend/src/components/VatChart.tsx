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
import type { VatEntry } from '../types';
import { formatCurrency } from '../utils/format';
import { InfoTooltip } from './InfoTooltip';
import { useChartColors } from '../utils/useChartColors';
import { useScrollReveal } from '../hooks/useScrollReveal';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

interface VatChartProps {
  vat: VatEntry[];
}

export function VatChart({ vat }: VatChartProps) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  const cc = useChartColors();
  const labels = vat.map((v) => `${v.trimestre} ${v.anio}`);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'IVA Repercutido',
        data: vat.map((v) => v.iva_repercutido),
        backgroundColor: 'rgba(252, 213, 53, 0.7)',
        borderColor: 'rgb(252, 213, 53)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'IVA Soportado',
        data: vat.map((v) => v.iva_soportado),
        backgroundColor: 'rgba(113, 128, 150, 0.7)',
        borderColor: 'rgb(113, 128, 150)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'IVA a Pagar',
        data: vat.map((v) => v.iva_a_pagar),
        backgroundColor: 'rgba(14, 203, 129, 0.7)',
        borderColor: 'rgb(14, 203, 129)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: cc.legend, font: { size: 11 } },
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
        isVisible ? 'animate-fadeSlideUp' : 'opacity-0'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide">
          IVA Trimestral
        </h3>
        <InfoTooltip text="IVA repercutido (cobrado a clientes), soportado (pagado a proveedores) y diferencia a pagar a Hacienda, desglosados por trimestre del año en curso." />
      </div>
      <Bar data={chartData} options={options} />
    </div>
  );
}
