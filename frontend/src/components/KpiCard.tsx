interface KpiCardProps {
  label: string;
  value: string;
}

export function KpiCard({ label, value }: KpiCardProps) {
  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline">
      <p className="text-xs font-medium text-bn-muted uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-bold text-bn-yellow">{value}</p>
    </div>
  );
}
