interface KpiCardProps {
  label: string;
  value: string;
  tone?: 'up' | 'down' | 'neutral';
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

export function KpiCard({ label, value, tone = 'neutral' }: KpiCardProps) {
  const glyph = toneGlyph[tone];

  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline">
      <p className="text-xs font-medium text-bn-muted uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold flex items-center gap-1.5 ${toneClasses[tone]}`}>
        {glyph && <span className="text-base">{glyph}</span>}
        {value}
      </p>
    </div>
  );
}
