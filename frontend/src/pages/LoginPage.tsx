import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { isAuthed, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthed) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError(null);
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-bn-canvas px-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-bn-yellow tracking-tight">Invoice Insights</h1>
          <p className="text-sm text-bn-muted mt-1">
            Análisis financiero inteligente para autónomos y PYMEs
          </p>
        </div>

        {/* Card */}
        <div className="bg-bn-card rounded-xl p-8 border border-bn-hairline">
          <h2 className="text-lg font-semibold text-bn-body mb-6">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-bn-muted-strong mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-bn-elevated border border-bn-hairline rounded text-sm text-bn-body placeholder-bn-muted px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-bn-yellow/40 focus:border-bn-yellow transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-bn-muted-strong mb-1.5 uppercase tracking-wide">
                Contraseña
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full bg-bn-elevated border border-bn-hairline rounded text-sm text-bn-body placeholder-bn-muted px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-bn-yellow/40 focus:border-bn-yellow transition-colors"
              />
            </div>

            {error && (
              <p className="text-sm text-bn-down">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-bn-yellow text-bn-ink font-semibold text-sm py-2.5 rounded hover:bg-bn-yellow-hover transition-colors disabled:bg-bn-yellow-dim disabled:text-bn-muted disabled:cursor-not-allowed mt-2"
            >
              {submitting
                ? 'Cargando…'
                : mode === 'login'
                  ? 'Iniciar sesión'
                  : 'Crear cuenta'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-bn-muted">
            {mode === 'login' ? (
              <>
                ¿Sin cuenta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('register')}
                  className="text-bn-yellow hover:text-bn-yellow-hover font-medium transition-colors"
                >
                  Regístrate
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-bn-yellow hover:text-bn-yellow-hover font-medium transition-colors"
                >
                  Inicia sesión
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
