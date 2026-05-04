import { InfoTooltip } from './InfoTooltip';

interface InsightsPanelProps {
  insights: string[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <div className="bg-bn-card border-l-4 border-l-bn-yellow border border-bn-hairline rounded-xl px-6 py-4 mb-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-xs font-semibold text-bn-muted uppercase tracking-wide">
          Análisis automático
        </p>
        <InfoTooltip text="Conclusiones derivadas automáticamente de tus datos: concentración de clientes, alertas de IVA, tendencias de gasto y otros indicadores clave." />
      </div>
      <ul className="space-y-2">
        {insights.map((insight, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-bn-body">
            <span className="text-bn-yellow shrink-0">→</span>
            {insight}
          </li>
        ))}
      </ul>
    </div>
  );
}
