import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  cta?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, cta, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-3 ${compact ? 'py-8' : 'py-16'}`}>
      <span className={`opacity-30 ${compact ? 'text-3xl' : 'text-5xl'}`}>{icon}</span>
      <p className={`font-semibold text-bn-body ${compact ? 'text-sm' : 'text-base'}`}>{title}</p>
      {description && (
        <p className={`text-bn-muted max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>
      )}
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  );
}
