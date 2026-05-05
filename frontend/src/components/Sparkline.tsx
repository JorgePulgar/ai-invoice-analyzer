interface SparklineProps {
  series: number[];
  tone?: 'up' | 'down' | 'neutral';
  width?: number;
  height?: number;
}

const strokeColor: Record<NonNullable<SparklineProps['tone']>, string> = {
  up:      '#0ECB81',
  down:    '#F6465D',
  neutral: '#FCD535',
};

export function Sparkline({ series, tone = 'neutral', width = 60, height = 20 }: SparklineProps) {
  if (series.length < 2) return null;

  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  const xStep = width / (series.length - 1);
  const points = series.map((v, i) => {
    const x = i * xStep;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const d = `M ${points.join(' L ')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="absolute bottom-3 right-3 opacity-40"
      aria-hidden="true"
    >
      <path d={d} fill="none" stroke={strokeColor[tone]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
