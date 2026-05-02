interface KpiCardProps {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'neutral';
  trend?: { pct: number };
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

export function KpiCard({ label, value, tone = 'neutral', trend }: KpiCardProps) {
  const glyph = toneGlyph[tone];

  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline border-t-2 border-t-bn-yellow/40 hover:shadow-lg transition-shadow duration-200">
      <p className="text-xs font-medium text-bn-muted uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold flex items-center gap-1.5 ${toneClasses[tone]}`}>
        {glyph && <span className="text-base">{glyph}</span>}
        {value}
      </p>
      {trend !== undefined && (
        <p className={`text-xs mt-1 font-medium ${trend.pct >= 0 ? 'text-bn-up' : 'text-bn-down'}`}>
          {trend.pct >= 0 ? '↑' : '↓'} {trend.pct >= 0 ? '+' : ''}{Math.round(trend.pct)}%
        </p>
      )}
    </div>
  );
}
