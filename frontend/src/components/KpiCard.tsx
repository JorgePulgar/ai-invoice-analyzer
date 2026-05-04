import { useScrollReveal } from '../hooks/useScrollReveal';
import { InfoTooltip } from './InfoTooltip';

interface KpiCardProps {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'neutral';
  trend?: { pct: number };
  info?: string;
  style?: React.CSSProperties;
}

const toneValueColor: Record<NonNullable<KpiCardProps['tone']>, string> = {
  up:      'text-bn-up',
  down:    'text-bn-down',
  neutral: 'text-bn-body',
};

const toneAccent: Record<NonNullable<KpiCardProps['tone']>, string> = {
  up:      'border-t-bn-up',
  down:    'border-t-bn-down',
  neutral: 'border-t-bn-yellow',
};

const trendStyle = (pct: number) =>
  pct >= 0 ? 'bg-bn-up/10 text-bn-up' : 'bg-bn-down/10 text-bn-down';

export function KpiCard({ label, value, tone = 'neutral', trend, info, style }: KpiCardProps) {
  const { ref, revealClass } = useScrollReveal();

  return (
    <div ref={ref} style={style} className={revealClass}>
      <div
        className={`
          relative bg-bn-card rounded-2xl p-4 border border-bn-hairline border-t-2
          ${toneAccent[tone]}
          hover:shadow-xl hover:-translate-y-0.5
          transition-all duration-200
          min-w-0 overflow-hidden flex flex-col gap-2
        `}
      >
        <div className="flex items-start justify-between gap-1">
          <p className="text-[10px] font-semibold text-bn-muted uppercase tracking-widest leading-tight">
            {label}
          </p>
          {info && <div className="flex-shrink-0"><InfoTooltip text={info} /></div>}
        </div>

        <p className={`text-xl font-extrabold leading-none tracking-tight ${toneValueColor[tone]}`}>
          {value}
        </p>

        {trend !== undefined ? (
          <span
            className={`
              self-start inline-flex items-center gap-0.5
              text-[10px] font-semibold
              px-1.5 py-0.5 rounded-full
              ${trendStyle(trend.pct)}
            `}
          >
            {trend.pct >= 0 ? '↑' : '↓'}
            {trend.pct >= 0 ? '+' : ''}
            {Math.round(trend.pct)}%
          </span>
        ) : (
          <span className="h-4" />
        )}
      </div>
    </div>
  );
}
