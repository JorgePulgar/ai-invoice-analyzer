import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { DropZone } from '../components/DropZone';
import { TipoBadge } from '../components/TipoBadge';
import { FacturaForm } from '../components/FacturaForm';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/format';
import type { DraftFactura, Factura } from '../types';

type Status = 'idle' | 'extracting' | 'review' | 'saving' | 'success' | 'error';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (file.type !== 'application/pdf' || !file.name.toLowerCase().endsWith('.pdf')) {
    return 'El archivo debe ser un PDF.';
  }
  if (file.size > MAX_SIZE_BYTES) {
    return 'El archivo supera el límite de 10 MB.';
  }
  return null;
}

const EXTRACT_STEPS = ['Validando PDF', 'Extrayendo con IA', 'Verificando datos'];

function ProgressStrip({ step }: { step: number }) {
  return (
    <div className="mt-6 flex items-center gap-2">
      {EXTRACT_STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`flex-1 h-1 rounded-full transition-colors duration-500 ${i <= step ? 'bg-bn-yellow' : 'bg-bn-hairline'}`} />
          <span className={`text-xs whitespace-nowrap transition-colors duration-300 ${i === step ? 'text-bn-body font-semibold' : i < step ? 'text-bn-up' : 'text-bn-muted'}`}>
            {i < step ? '✓' : i === step ? <span className="inline-block animate-pulse">{label}</span> : label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function UploadPage() {
  const navigate = useNavigate();
  const { success, error: toastError } = useToast();
  const [status, setStatus] = useState<Status>('idle');
  const [extractStep, setExtractStep] = useState(0);
  const [draft, setDraft] = useState<DraftFactura | null>(null);
  const [result, setResult] = useState<Factura | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setStatus('error');
      setDraft(null);
      setResult(null);
      return;
    }

    setError(null);
    setDraft(null);
    setResult(null);
    setExtractStep(0);

    try {
      setStatus('extracting');
      // Simulate multi-step progress in mock mode
      setExtractStep(0);
      await new Promise((r) => setTimeout(r, 300));
      setExtractStep(1);
      const extracted = await api.extractFactura(file);
      setExtractStep(2);
      await new Promise((r) => setTimeout(r, 200));
      setDraft(extracted);
      setStatus('review');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al extraer la factura';
      setError(msg);
      setStatus('error');
      toastError(msg);
    }
  };

  const handleConfirm = async (confirmed: DraftFactura) => {
    setStatus('saving');
    try {
      const factura = await api.confirmFactura(confirmed);
      setResult(factura);
      setDraft(null);
      setStatus('success');
      success('Factura guardada correctamente');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la factura';
      setError(msg);
      setStatus('error');
      toastError(msg);
    }
  };

  const handleDiscard = () => {
    if (draft?.id) {
      api.discardDraft(draft.id).catch(() => {});
    }
    setDraft(null);
    setError(null);
    setStatus('idle');
  };

  const handleRetry = () => {
    setError(null);
    setStatus('idle');
    setDraft(null);
    setResult(null);
  };

  const isDropZoneDisabled = status === 'extracting' || status === 'review' || status === 'saving';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-bn-body mb-1">Subir factura</h2>
        <p className="text-sm text-bn-muted mb-6">
          Sube una factura en PDF para extraer sus datos automáticamente.
        </p>

        <DropZone onFile={handleFile} disabled={isDropZoneDisabled} />

        {status === 'extracting' && <ProgressStrip step={extractStep} />}

        {status === 'saving' && (
          <p className="mt-4 text-sm font-medium text-bn-muted animate-pulse">Guardando…</p>
        )}

        {/* Error with retry */}
        {error && (
          <div className="mt-4 bg-bn-down/10 border border-bn-down/30 rounded-xl px-4 py-3 flex items-start gap-3">
            <span className="text-bn-down font-bold mt-0.5">✕</span>
            <p className="flex-1 text-sm text-bn-down">{error}</p>
            <button
              onClick={handleRetry}
              className="shrink-0 text-xs font-semibold text-bn-down underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Review form (Phase 2 mock path) */}
        {(status === 'review' || status === 'saving') && draft && (
          <FacturaForm
            initial={draft}
            onSubmit={handleConfirm}
            onCancel={handleDiscard}
            submitting={status === 'saving'}
          />
        )}

        {/* Success card */}
        {status === 'success' && result && (
          <div className="mt-6 bg-bn-card rounded-xl border border-bn-hairline overflow-hidden animate-fadeSlideUp">
            <div className="px-6 py-4 border-b border-bn-hairline bg-bn-up/5 flex items-center gap-3">
              <span className="text-bn-up font-bold text-lg">✓</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-bn-body">{result.numero}</p>
                <p className="text-xs text-bn-muted">
                  {formatDate(result.fecha)} · {formatCurrency(result.total, result.moneda)}
                </p>
              </div>
              <TipoBadge tipo={result.tipo} size="md" />
            </div>
            <div className="px-6 py-4 flex gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex-1 text-sm font-semibold bg-bn-yellow text-bn-ink px-4 py-2 rounded-lg hover:bg-bn-yellow-hover transition-colors text-center"
              >
                Ver dashboard
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 text-sm font-semibold border border-bn-hairline text-bn-body px-4 py-2 rounded-lg hover:bg-bn-elevated transition-colors"
              >
                Subir otra factura
              </button>
            </div>
          </div>
        )}

        {/* Legacy result display — only when no success card */}
        {status !== 'success' && result && (
          <div className="mt-6 bg-bn-card rounded-xl border border-bn-hairline overflow-hidden">
            <div className="px-6 py-3 border-b border-bn-hairline flex items-center justify-between">
              <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide">
                Datos extraídos
              </h3>
              <TipoBadge tipo={result.tipo} size="md" />
            </div>
            <pre className="px-6 py-4 text-xs text-bn-body overflow-x-auto leading-relaxed">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        {status === 'success' && !result && (
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-bn-yellow px-4 py-2 text-sm font-semibold text-black hover:bg-bn-yellow-hover transition-colors"
          >
            Ir al dashboard →
          </Link>
        )}
      </div>
    </Layout>
  );
}
