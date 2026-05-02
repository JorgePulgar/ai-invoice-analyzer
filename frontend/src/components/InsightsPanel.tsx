interface InsightsPanelProps {
  insights: string[];
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  if (insights.length === 0) return null;

  return (
    <div className="bg-bn-card border-l-4 border-l-bn-yellow border border-bn-hairline rounded-xl px-6 py-4 mb-6">
      <p className="text-xs font-semibold text-bn-muted uppercase tracking-wide mb-3">
        Análisis automático
      </p>
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
