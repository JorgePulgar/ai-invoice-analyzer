import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import type { Factura } from '../types';
import { formatDate } from '../utils/format';

interface InvoiceHeatmapProps {
  facturas: Factura[];
}

// Swatch colors match the .color-github-N overrides in index.css
const LEGEND_COLORS = ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'] as const;

export function InvoiceHeatmap({ facturas }: InvoiceHeatmapProps) {
  const year = new Date().getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const counts = new Map<string, number>();
  for (const f of facturas) {
    const day = f.fecha.slice(0, 10);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const values = Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
  const maxCount = values.length > 0 ? Math.max(...values.map((v) => v.count)) : 0;

  function bucket(count: number): 0 | 1 | 2 | 3 | 4 {
    if (count === 0 || maxCount === 0) return 0;
    if (count <= maxCount * 0.25) return 1;
    if (count <= maxCount * 0.5) return 2;
    if (count <= maxCount * 0.75) return 3;
    return 4;
  }

  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline mb-6">
      <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide mb-4">
        Actividad de facturación
      </h3>
      <div className="overflow-x-auto">
        <CalendarHeatmap
          startDate={startDate}
          endDate={endDate}
          values={values}
          classForValue={(value) => {
            if (!value || value.count === 0) return 'color-github-0';
            return `color-github-${bucket(value.count)}`;
          }}
          titleForValue={(value) => {
            if (!value || !value.date) return 'Sin facturas';
            const count = value.count ?? 0;
            return `${count} ${count === 1 ? 'factura' : 'facturas'} — ${formatDate(value.date)}`;
          }}
          showWeekdayLabels
        />
      </div>
      <div className="flex items-center gap-1 mt-3 justify-end">
        <span className="text-[10px] text-bn-muted mr-1">Menos</span>
        {LEGEND_COLORS.map((color, i) => (
          <span
            key={i}
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        ))}
        <span className="text-[10px] text-bn-muted ml-1">Más</span>
      </div>
    </div>
  );
}
