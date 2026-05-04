import { InfoTooltip } from './InfoTooltip';

interface KpiCardProps {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'neutral';
  trend?: { pct: number };
  info?: string;
}

const toneClasses: Record<NonNullable<KpiCardProps['tone']>, string> = {
  up: 'text-bn-up',
  down: 'text-bn-down',
  neutral: 'text-bn-yellow',
};

const toneGlyph: Record<NonNullable<KpiCardProps['tone']>, string | null> = {
  up: '▲',
  down: '▼',
  neutral: null,
};

export function KpiCard({ label, value, tone = 'neutral', trend, info }: KpiCardProps) {
  const glyph = toneGlyph[tone];

  return (
    <div className="bg-bn-card rounded-xl p-3 border border-bn-hairline overflow-hidden flex flex-col">
      <div className="flex items-start justify-between gap-1 mb-1 min-h-0">
        <p className="text-[10px] font-medium text-bn-muted uppercase tracking-tight leading-tight flex-1 break-words">
          {label}
        </p>
        {info && <div className="flex-shrink-0"><InfoTooltip text={info} /></div>}
      </div>
      <p className={`text-lg font-bold flex items-center gap-0.5 leading-tight ${toneClasses[tone]}`}>
        {glyph && <span className="text-sm flex-shrink-0">{glyph}</span>}
        <span className="break-words">{value}</span>
      </p>
      {trend !== undefined && (
        <p className={`text-[10px] mt-0.5 font-medium leading-tight ${trend.pct >= 0 ? 'text-bn-up' : 'text-bn-down'}`}>
          {trend.pct >= 0 ? '↑' : '↓'} {trend.pct >= 0 ? '+' : ''}{Math.round(trend.pct)}%
        </p>
      )}
    </div>
  );
}
