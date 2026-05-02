import { useState } from 'react';
import type { ClientEntry, Summary, VatEntry } from '../types';
import { deriveAlerts } from '../utils/alerts';

interface AlertsBannerProps {
  summary: Summary | null;
  vat: VatEntry[];
  clients: ClientEntry[];
}

function isDismissed(key: string): boolean {
  return localStorage.getItem(`ii_dismissed_${key}`) === '1';
}

function dismiss(key: string): void {
  localStorage.setItem(`ii_dismissed_${key}`, '1');
}

export function AlertsBanner({ summary, vat, clients }: AlertsBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (!summary) return new Set();
    const alerts = deriveAlerts(summary, vat, clients);
    return new Set(alerts.map((a) => a.key).filter(isDismissed));
  });

  if (!summary) return null;

  const alerts = deriveAlerts(summary, vat, clients).filter((a) => !dismissed.has(a.key));
  if (alerts.length === 0) return null;

  const handleDismiss = (key: string) => {
    dismiss(key);
    setDismissed((prev) => new Set([...prev, key]));
  };

  return (
    <div className="flex flex-col gap-2 mb-6">
      {alerts.map((alert) => (
        <div
          key={alert.key}
          className={`flex items-start justify-between gap-4 rounded-xl px-5 py-3 border ${
            alert.severity === 'warning'
              ? 'bg-bn-card border-l-4 border-l-bn-yellow border-bn-hairline'
              : 'bg-bn-card border-l-4 border-l-bn-info border-bn-hairline'
          }`}
        >
          <p className="text-sm text-bn-body leading-snug">{alert.message}</p>
          <button
            onClick={() => handleDismiss(alert.key)}
            className="shrink-0 text-bn-muted hover:text-bn-body transition-colors text-lg leading-none mt-0.5"
            aria-label="Cerrar alerta"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
