import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import type { TooltipItem } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import type { Factura } from '../types';
import { formatCurrency } from '../utils/format';
import { InfoTooltip } from './InfoTooltip';

ChartJS.register(ArcElement, Tooltip, Legend);

const CATEGORIES: Array<{ name: string; keywords: string[] }> = [
  { name: 'Software', keywords: ['adobe', 'notion', 'github', 'figma', 'slack', 'zoom', 'hosting', 'dominio', 'suscripci', 'microsoft', 'aws', 'cloud'] },
  { name: 'Transporte', keywords: ['taxi', 'uber', 'renfe', 'vuelo', 'gasolina', 'parking', 'transporte'] },
  { name: 'Marketing', keywords: ['publicidad', 'ads', 'marketing', 'diseño', 'contenido'] },
  { name: 'Equipamiento', keywords: ['ordenador', 'portátil', 'monitor', 'impresora', 'hardware'] },
  { name: 'Oficina', keywords: ['material', 'papelería', 'alquiler', 'suministros', 'electricidad', 'internet'] },
  { name: 'Gestoría', keywords: ['gestor', 'asesor', 'contabilidad', 'notario', 'impuesto', 'tributo', 'gestoría', 'cuotas'] },
];

const PALETTE = [
  'rgb(252, 213, 53)',
  'rgb(14, 203, 129)',
  'rgb(246, 70, 93)',
  'rgb(113, 128, 150)',
  'rgb(72, 187, 120)',
  'rgb(160, 174, 192)',
  'rgb(203, 213, 224)',
];

function categorise(concepto: string | null): string {
  if (!concepto) return 'Otros';
  const lower = concepto.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.name;
  }
  return 'Otros';
}

interface ExpenseCategoriesChartProps {
  facturas: Factura[];
}

export function ExpenseCategoriesChart({ facturas }: ExpenseCategoriesChartProps) {
  const gastos = facturas.filter((f) => f.tipo === 'gasto');

  if (gastos.length === 0) {
    return (
      <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline flex items-center justify-center min-h-[200px]">
        <p className="text-bn-muted text-sm">No expense data available.</p>
      </div>
    );
  }

  const totals = new Map<string, number>();
  for (const f of gastos) {
    const cat = categorise(f.concepto);
    totals.set(cat, (totals.get(cat) ?? 0) + f.total);
  }

  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map(([name]) => name);
  const values = sorted.map(([, val]) => val);

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]),
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
        labels: {
          color: '#EAECEF',
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
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide">
          Categorías de gasto
        </h3>
        <InfoTooltip text="Reparto de tus facturas de gasto por categoría, asignadas automáticamente según el concepto. Agrupa gastos no reconocidos como 'Otros'." />
      </div>
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
