import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { isAuthed } = useAuth();
  if (isAuthed) return <Navigate to="/dashboard" replace />;

  // TODO: implement login + register forms with state, validation,
  // call useAuth().login / .register, redirect on success, render error message.
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-1">Invoice Insights</h1>
        <p className="text-slate-500 mb-6 text-sm">
          Análisis financiero inteligente para autónomos y PYMEs
        </p>
        <p className="text-sm text-slate-400">TODO: login / register form</p>
      </div>
    </main>
  );
}
