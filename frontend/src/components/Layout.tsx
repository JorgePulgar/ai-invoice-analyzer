import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { toggleTheme, getInitialTheme } from '../utils/theme';
import { CommandPalette } from './CommandPalette';
import { ShortcutHelp } from './ShortcutHelp';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import type { ClientEntry, Factura, SupplierEntry } from '../types';

interface LayoutProps {
  children: ReactNode;
  facturas?: Factura[];
  clients?: ClientEntry[];
  suppliers?: SupplierEntry[];
  onSelectFactura?: (factura: Factura) => void;
}

export function Layout({ children, facturas = [], clients = [], suppliers = [], onSelectFactura }: LayoutProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getInitialTheme);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleThemeToggle = useCallback(() => {
    const next = toggleTheme();
    setTheme(next);
  }, []);

  useKeyboardShortcuts({
    'meta+k': () => setPaletteOpen(true),
    'ctrl+k': () => setPaletteOpen(true),
    '?': () => setHelpOpen(true),
    escape: () => { setPaletteOpen(false); setHelpOpen(false); setDrawerOpen(false); },
  });

  return (
    <div className="min-h-screen bg-bn-canvas text-bn-body">
      {/* Skip to content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-bn-yellow focus:text-bn-ink focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold"
      >
        Saltar al contenido
      </a>

      <header className="bg-bn-canvas border-b border-bn-hairline sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-bn-yellow font-bold text-lg tracking-tight hover:opacity-80 transition-opacity cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bn-yellow/40 rounded"
          >
            Invoice Insights
          </button>

          {/* Desktop nav */}
          <nav className="hidden sm:flex gap-4 items-center">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-bn-muted-strong hover:text-bn-yellow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bn-yellow/40 rounded"
            >
              Panel
            </Link>
            <Link
              to="/upload"
              className="text-sm font-medium text-bn-muted-strong hover:text-bn-yellow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bn-yellow/40 rounded"
            >
              Subir
            </Link>
            <button
              onClick={() => setPaletteOpen(true)}
              title="Paleta de comandos (⌘K / Ctrl+K)"
              aria-label="Abrir paleta de comandos"
              className="text-xs text-bn-muted hover:text-bn-yellow transition-colors border border-bn-hairline rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bn-yellow/40"
            >
              ⌘K
            </button>
            <button
              onClick={handleThemeToggle}
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className="text-sm text-bn-muted hover:text-bn-yellow transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bn-yellow/40 rounded px-1"
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm font-semibold bg-bn-yellow text-bn-ink px-4 py-1.5 rounded hover:bg-bn-yellow-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bn-yellow/40"
            >
              Cerrar sesión
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden text-bn-muted hover:text-bn-body transition-colors p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bn-yellow/40 rounded"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <rect y="3" width="20" height="2" rx="1" />
              <rect y="9" width="20" height="2" rx="1" />
              <rect y="15" width="20" height="2" rx="1" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fadeIn sm:hidden"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed top-0 right-0 h-full w-64 z-50 bg-bn-card border-l border-bn-hairline shadow-2xl flex flex-col animate-fadeIn sm:hidden">
            <div className="flex items-center justify-between px-6 h-16 border-b border-bn-hairline">
              <span className="text-bn-yellow font-bold">Invoice Insights</span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar menú"
                className="text-bn-muted hover:text-bn-body transition-colors text-xl leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bn-yellow/40 rounded"
              >
                ×
              </button>
            </div>
            <nav className="flex flex-col p-4 gap-1 flex-1">
              <Link
                to="/dashboard"
                onClick={() => setDrawerOpen(false)}
                className="text-sm font-medium text-bn-body px-3 py-2 rounded-lg hover:bg-bn-elevated transition-colors"
              >
                Panel
              </Link>
              <Link
                to="/upload"
                onClick={() => setDrawerOpen(false)}
                className="text-sm font-medium text-bn-body px-3 py-2 rounded-lg hover:bg-bn-elevated transition-colors"
              >
                Subir factura
              </Link>
              <button
                onClick={() => { setDrawerOpen(false); setPaletteOpen(true); }}
                className="text-left text-sm font-medium text-bn-body px-3 py-2 rounded-lg hover:bg-bn-elevated transition-colors"
              >
                Paleta de comandos
              </button>
            </nav>
            <div className="p-4 border-t border-bn-hairline flex flex-col gap-2">
              <button
                onClick={() => { handleThemeToggle(); setDrawerOpen(false); }}
                className="text-sm text-bn-muted px-3 py-2 rounded-lg hover:bg-bn-elevated transition-colors text-left"
              >
                {theme === 'dark' ? '☀ Modo claro' : '☾ Modo oscuro'}
              </button>
              <button
                onClick={handleLogout}
                className="text-sm font-semibold bg-bn-yellow text-bn-ink px-4 py-2 rounded-lg hover:bg-bn-yellow-hover transition-colors"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}

      <main id="main-content" className="max-w-6xl mx-auto px-6 py-8 animate-fadeIn">
        {children}
      </main>

      {paletteOpen && (
        <CommandPalette
          facturas={facturas}
          clients={clients}
          suppliers={suppliers}
          onClose={() => setPaletteOpen(false)}
          onThemeChange={() => setTheme(getInitialTheme())}
          onSelectFactura={onSelectFactura}
        />
      )}

      {helpOpen && <ShortcutHelp onClose={() => setHelpOpen(false)} />}
    </div>
  );
}
