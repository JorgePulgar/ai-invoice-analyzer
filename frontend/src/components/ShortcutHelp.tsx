interface ShortcutHelpProps {
  onClose: () => void;
}

const SHORTCUTS: Array<{ key: string; label: string }> = [
  { key: '⌘K / Ctrl+K', label: 'Abrir paleta de comandos' },
  { key: '?', label: 'Mostrar esta ayuda' },
  { key: 'Esc', label: 'Cerrar modal / paleta' },
];

export function ShortcutHelp({ onClose }: ShortcutHelpProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-bn-card border border-bn-hairline rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-bn-body">Atajos de teclado</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar ayuda"
            className="text-bn-muted hover:text-bn-body transition-colors text-lg leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bn-yellow/40 rounded"
          >
            ×
          </button>
        </div>
        <ul className="space-y-2">
          {SHORTCUTS.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-4">
              <span className="text-sm text-bn-muted">{s.label}</span>
              <kbd className="text-xs font-mono bg-bn-elevated border border-bn-hairline text-bn-body px-2 py-1 rounded shrink-0">
                {s.key}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
