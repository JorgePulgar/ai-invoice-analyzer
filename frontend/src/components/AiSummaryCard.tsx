import type { AiSummary } from '../types';
import { formatDate } from '../utils/format';
import { InfoTooltip } from './InfoTooltip';

interface AiSummaryCardProps {
  summary: AiSummary | null;
  loading: boolean;
}

export function AiSummaryCard({ summary, loading }: AiSummaryCardProps) {
  if (!loading && summary === null) return null;

  return (
    <div className="bg-bn-card border-l-4 border-l-bn-yellow border border-bn-hairline rounded-xl px-6 py-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-bn-muted uppercase tracking-wide">
            ✨ Resumen del periodo
          </p>
          <InfoTooltip text="Análisis narrativo de tu situación financiera generado por IA a partir de tus facturas. Se actualiza cada 24 horas." />
        </div>
        {summary && (
          <p className="text-xs text-bn-muted">
            Generado el {formatDate(summary.generated_at)}
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-4 bg-bn-elevated rounded w-full" />
          <div className="h-4 bg-bn-elevated rounded w-5/6" />
          <div className="h-4 bg-bn-elevated rounded w-4/6" />
        </div>
      ) : (
        <p className="text-base leading-relaxed text-bn-body">{summary?.narrative}</p>
      )}
    </div>
  );
}
