import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { toggleTheme, getInitialTheme } from '../utils/theme';

export function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getInitialTheme);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleThemeToggle = () => {
    const next = toggleTheme();
    setTheme(next);
  };

  return (
    <div className="min-h-screen bg-bn-canvas text-bn-body">
      <header className="bg-bn-canvas border-b border-bn-hairline sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-bn-yellow font-bold text-lg tracking-tight hover:opacity-80 transition-opacity cursor-pointer"
          >
            Invoice Insights
          </button>
          <nav className="flex gap-4 items-center">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-bn-muted-strong hover:text-bn-yellow transition-colors"
            >
              Panel
            </Link>
            <Link
              to="/upload"
              className="text-sm font-medium text-bn-muted-strong hover:text-bn-yellow transition-colors"
            >
              Subir
            </Link>
            <button
              onClick={handleThemeToggle}
              className="text-sm text-bn-muted hover:text-bn-yellow transition-colors"
              aria-label="Cambiar tema"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? '☀' : '☾'}
            </button>
            <button
              onClick={handleLogout}
              className="text-sm font-semibold bg-bn-yellow text-bn-ink px-4 py-1.5 rounded hover:bg-bn-yellow-hover transition-colors"
            >
              Cerrar sesión
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
