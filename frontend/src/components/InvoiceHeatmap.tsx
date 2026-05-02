import CalendarHeatmap from 'react-calendar-heatmap';
import 'react-calendar-heatmap/dist/styles.css';
import type { Factura } from '../types';
import { formatDate } from '../utils/format';

interface InvoiceHeatmapProps {
  facturas: Factura[];
}

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
          if (!value || value.count === 0) return 'color-empty';
          if (value.count === 1) return 'color-scale-1';
          if (value.count === 2) return 'color-scale-2';
          if (value.count === 3) return 'color-scale-3';
          return 'color-scale-4';
        }}
        titleForValue={(value) => {
          if (!value || !value.date) return 'No invoices';
          const count = value.count ?? 0;
          return `${count} ${count === 1 ? 'factura' : 'facturas'} — ${formatDate(value.date)}`;
        }}
        showWeekdayLabels
      />
      </div>
    </div>
  );
}
