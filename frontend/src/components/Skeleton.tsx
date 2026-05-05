export function SkeletonCard() {
  return (
    <div className="bg-bn-card rounded-2xl p-4 border border-bn-hairline border-t-2 border-t-bn-hairline min-w-0 flex flex-col gap-3">
      <div className="h-2.5 w-24 rounded-full bg-bn-elevated animate-pulse" />
      <div className="h-6 w-20 rounded bg-bn-elevated animate-pulse" />
      <div className="h-4 w-12 rounded-full bg-bn-elevated animate-pulse" />
    </div>
  );
}

export function SkeletonChart({ height = 280 }: { height?: number }) {
  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline">
      <div className="h-2.5 w-32 rounded-full bg-bn-elevated animate-pulse mb-4" />
      <div
        className="w-full rounded-lg bg-bn-elevated animate-pulse"
        style={{ height }}
      />
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr className="border-b border-bn-hairline">
      {[40, 32, 48, 48, 28, 24, 16].map((w, i) => (
        <td key={i} className="px-6 py-3">
          <div className={`h-3 rounded-full bg-bn-elevated animate-pulse w-${w}`} style={{ width: `${w * 4}px` }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-bn-card rounded-xl p-6 border border-bn-hairline">
      <div className="h-2.5 w-28 rounded-full bg-bn-elevated animate-pulse mb-4" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-bn-hairline last:border-0">
            <div className="flex items-center gap-3">
              <div className="h-3 w-4 rounded bg-bn-elevated animate-pulse" />
              <div className="h-3 rounded-full bg-bn-elevated animate-pulse" style={{ width: `${90 + (i % 3) * 20}px` }} />
            </div>
            <div className="h-3 w-16 rounded-full bg-bn-elevated animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
