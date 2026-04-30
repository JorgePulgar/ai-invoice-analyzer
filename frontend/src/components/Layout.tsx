import { Link, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-lg font-semibold">Invoice Insights</h1>
          <nav className="flex gap-4 items-center">
            <Link to="/dashboard" className="text-slate-700 hover:text-blue-600">
              Dashboard
            </Link>
            <Link to="/upload" className="text-slate-700 hover:text-blue-600">
              Subir factura
            </Link>
            <button
              onClick={handleLogout}
              className="bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 text-sm"
            >
              Salir
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
