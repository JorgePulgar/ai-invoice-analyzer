import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useScrollReveal } from '../hooks/useScrollReveal';

const FEATURES = [
  {
    icon: '📄',
    title: 'Extracción con IA',
    description: 'Sube una factura PDF y extrae todos sus datos automáticamente con GPT-4o.',
  },
  {
    icon: '📊',
    title: 'Dashboard financiero',
    description: 'KPIs, gráficos de evolución mensual y tendencias de ingresos y gastos.',
  },
  {
    icon: '🧾',
    title: 'Resumen fiscal',
    description: 'IVA trimestral e IRPF retenido calculados automáticamente.',
  },
  {
    icon: '💡',
    title: 'Insights automáticos',
    description: 'Alertas y recomendaciones basadas en tus datos financieros.',
  },
];

export function LandingPage() {
  const { isAuthed } = useAuth();
  const [searchParams] = useSearchParams();
  const { ref: featuresRef, revealClass: featuresRevealClass } = useScrollReveal({ threshold: 0.1 });
  const isDemo = searchParams.get('demo') === '1';

  if (isAuthed) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-bn-canvas text-bn-body flex flex-col animate-fadeIn">
      {/* Nav */}
      <header className="border-b border-bn-hairline">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-bn-yellow font-bold text-lg tracking-tight">Invoice Insights</span>
          <Link
            to="/login"
            className="text-sm font-semibold bg-bn-yellow text-bn-ink px-4 py-1.5 rounded hover:bg-bn-yellow-hover transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <h1 className="text-4xl sm:text-5xl font-bold text-bn-body leading-tight max-w-2xl">
          Convierte tus facturas PDF en{' '}
          <span className="text-bn-yellow">información financiera</span> al instante
        </h1>
        <p className="mt-6 text-lg text-bn-muted max-w-xl">
          Invoice Insights extrae los datos de tus facturas con IA y los convierte en un dashboard
          financiero completo con seguimiento de IVA, IRPF e insights automáticos.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center">
          <Link
            to="/login?mode=register"
            className="bg-bn-yellow text-bn-ink font-semibold px-8 py-3 rounded-lg hover:bg-bn-yellow-hover transition-colors text-sm"
          >
            Empezar gratis
          </Link>
          <Link
            to="/login?demo=1"
            className="border border-bn-hairline text-bn-muted-strong font-semibold px-8 py-3 rounded-lg hover:border-bn-yellow hover:text-bn-yellow transition-colors text-sm"
          >
            Ver demo
          </Link>
        </div>

        {isDemo && (
          <div className="mt-6 bg-bn-card border border-bn-yellow/40 rounded-xl px-6 py-3 text-sm text-bn-body">
            <span className="font-semibold text-bn-yellow">Credenciales demo:</span>{' '}
            <span className="font-mono">demo@invoice-insights.com</span> /{' '}
            <span className="font-mono">demo1234</span>
          </div>
        )}
      </section>

      {/* Features */}
      <section
        ref={featuresRef}
        className={`bg-bn-card border-t border-bn-hairline py-20 px-6 ${
          featuresRevealClass
        }`}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-bn-body mb-12">
            Todo lo que necesitas para gestionar tus finanzas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="bg-bn-elevated rounded-xl p-6 border border-bn-hairline hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                style={{
                  animation: featuresVisible ? `fadeSlideUp 0.6s ease-out both ${i * 75}ms` : 'none',
                }}
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-base font-semibold text-bn-body mb-2">{f.title}</h3>
                <p className="text-sm text-bn-muted leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-bn-hairline py-6 px-6 text-center text-xs text-bn-muted">
        © {new Date().getFullYear()} Invoice Insights ·{' '}
        <Link to="/login" className="hover:text-bn-yellow transition-colors">
          Iniciar sesión
        </Link>
      </footer>
    </div>
  );
}
