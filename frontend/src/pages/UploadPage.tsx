import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { DropZone } from '../components/DropZone';
import { TipoBadge } from '../components/TipoBadge';
import { FacturaForm } from '../components/FacturaForm';
import { api } from '../services/api';
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

export function UploadPage() {
  const [status, setStatus] = useState<Status>('idle');
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

    try {
      setStatus('extracting');
      const extracted = await api.extractFactura(file);
      setDraft(extracted);
      setStatus('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al extraer la factura');
      setStatus('error');
    }
  };

  const handleConfirm = async (confirmed: DraftFactura) => {
    setStatus('saving');
    try {
      const factura = await api.confirmFactura(confirmed);
      setResult(factura);
      setDraft(null);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la factura');
      setStatus('error');
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

  const statusLabel: Partial<Record<Status, string>> = {
    extracting: 'Extrayendo datos…',
    saving: 'Guardando…',
    success: 'Guardado correctamente',
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

        {/* Status */}
        {statusLabel[status] && (
          <p
            className={`mt-4 text-sm font-medium ${
              status === 'success' ? 'text-bn-up' : 'text-bn-muted'
            }`}
          >
            {statusLabel[status]}
          </p>
        )}

        {/* Error */}
        {error && <p className="mt-4 text-sm text-bn-down">{error}</p>}

        {/* Review form (Phase 2 mock path) */}
        {(status === 'review' || status === 'saving') && draft && (
          <FacturaForm
            initial={draft}
            onSubmit={handleConfirm}
            onCancel={handleDiscard}
            submitting={status === 'saving'}
          />
        )}

        {/* Post-upload navigation */}
        {status === 'success' && (
          <Link
            to="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-bn-yellow px-4 py-2 text-sm font-semibold text-black hover:bg-bn-yellow-hover transition-colors"
          >
            Ir al dashboard →
          </Link>
        )}

        {/* Result (Phase 1 path + Phase 2 after confirm) */}
        {result && (
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
      </div>
    </Layout>
  );
}
