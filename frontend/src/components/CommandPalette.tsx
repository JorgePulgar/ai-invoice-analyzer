import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toggleTheme } from '../utils/theme';
import type { Factura } from '../types';

interface Command {
  id: string;
  label: string;
  description?: string;
  action: () => void;
}

interface CommandPaletteProps {
  facturas: Factura[];
  onClose: () => void;
  onThemeChange?: () => void;
}

export function CommandPalette({ facturas, onClose, onThemeChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const staticCommands: Command[] = useMemo(() => [
    {
      id: 'nav-dashboard',
      label: 'Ir al panel',
      description: 'Dashboard principal',
      action: () => { navigate('/dashboard'); onClose(); },
    },
    {
      id: 'nav-upload',
      label: 'Subir factura',
      description: 'Subir nueva factura PDF',
      action: () => { navigate('/upload'); onClose(); },
    },
    {
      id: 'clear-filters',
      label: 'Limpiar filtros',
      description: 'Restablecer todos los filtros',
      action: () => { navigate('/dashboard', { replace: true }); onClose(); },
    },
    {
      id: 'export-pdf',
      label: 'Exportar PDF',
      description: 'Imprimir / guardar como PDF',
      action: () => { window.print(); onClose(); },
    },
    {
      id: 'theme-toggle',
      label: 'Cambiar tema',
      description: 'Alternar modo oscuro / claro',
      action: () => { toggleTheme(); onThemeChange?.(); onClose(); },
    },
    {
      id: 'logout',
      label: 'Cerrar sesión',
      action: () => { logout(); navigate('/login'); onClose(); },
    },
  ], [navigate, logout, onClose, onThemeChange]);

  const facturaCommands: Command[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return facturas
      .filter(
        (f) =>
          f.numero.toLowerCase().includes(q) ||
          f.emisor.toLowerCase().includes(q) ||
          f.receptor.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((f) => ({
        id: `factura-${f.id}`,
        label: f.numero,
        description: `${f.emisor} · ${f.tipo}`,
        action: () => {
          navigate(`/dashboard?cliente=${encodeURIComponent(f.receptor)}`);
          onClose();
        },
      }));
  }, [query, facturas, navigate, onClose]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const matching = q
      ? staticCommands.filter(
          (c) =>
            c.label.toLowerCase().includes(q) ||
            (c.description?.toLowerCase().includes(q) ?? false),
        )
      : staticCommands;
    return [...matching, ...facturaCommands];
  }, [query, staticCommands, facturaCommands]);

  const safeCursor = Math.min(cursor, Math.max(0, filtered.length - 1));

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    const item = listRef.current?.children[safeCursor] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [safeCursor]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      filtered[safeCursor]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4 bg-black/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-bn-card border border-bn-hairline rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-bn-hairline">
          <span className="text-bn-muted text-sm">⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar comandos o facturas…"
            className="flex-1 bg-transparent text-sm text-bn-body placeholder:text-bn-muted focus:outline-none"
          />
          <kbd className="text-xs text-bn-muted bg-bn-elevated border border-bn-hairline px-1.5 py-0.5 rounded">
            Esc
          </kbd>
        </div>

        {filtered.length > 0 ? (
          <ul ref={listRef} className="max-h-72 overflow-y-auto py-2">
            {filtered.map((cmd, i) => (
              <li key={cmd.id}>
                <button
                  onClick={cmd.action}
                  onMouseEnter={() => setCursor(i)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                    i === safeCursor ? 'bg-bn-elevated' : 'hover:bg-bn-elevated'
                  }`}
                >
                  <span className="text-sm font-medium text-bn-body">{cmd.label}</span>
                  {cmd.description && (
                    <span className="text-xs text-bn-muted ml-auto">{cmd.description}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-bn-muted text-center py-8">Sin resultados</p>
        )}
      </div>
    </div>
  );
}
