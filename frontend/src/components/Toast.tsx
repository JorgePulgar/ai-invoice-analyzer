import { useToast } from '../context/ToastContext';
import type { ToastItem, ToastTone } from '../context/ToastContext';

const toneStyles: Record<ToastTone, string> = {
  success: 'bg-bn-up/10 border-bn-up/30 text-bn-up',
  error:   'bg-bn-down/10 border-bn-down/30 text-bn-down',
  info:    'bg-bn-info/10 border-bn-info/30 text-bn-info',
};

const toneIcon: Record<ToastTone, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  return (
    <div
      role="alert"
      className={`
        flex items-start gap-3 px-4 py-3
        rounded-xl border shadow-lg backdrop-blur-sm
        text-sm font-medium
        animate-fadeSlideUp
        ${toneStyles[toast.tone]}
      `}
    >
      <span className="shrink-0 font-bold text-base leading-none mt-0.5">{toneIcon[toast.tone]}</span>
      <p className="flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        aria-label="Cerrar notificación"
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
      >
        ×
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastCard toast={t} onDismiss={() => dismiss(t.id)} />
        </div>
      ))}
    </div>
  );
}
