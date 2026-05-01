import { useState } from 'react';
import { Layout } from '../components/Layout';
import { DropZone } from '../components/DropZone';
import { api } from '../services/api';
import type { Factura } from '../types';

type Status = 'idle' | 'uploading' | 'success' | 'error';

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
  const [result, setResult] = useState<Factura | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setStatus('error');
      setResult(null);
      return;
    }

    setError(null);
    setResult(null);
    setStatus('uploading');

    try {
      const factura = await api.uploadFactura(file);
      setResult(factura);
      setStatus('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la factura');
      setStatus('error');
    }
  };

  const statusLabel: Record<Status, string | null> = {
    idle: null,
    uploading: 'Procesando…',
    success: 'Subido correctamente',
    error: null,
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-bn-body mb-1">Subir factura</h2>
        <p className="text-sm text-bn-muted mb-6">
          Sube una factura en PDF para extraer sus datos automáticamente.
        </p>

        <DropZone onFile={handleFile} disabled={status === 'uploading'} />

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
        {error && (
          <p className="mt-4 text-sm text-bn-down">{error}</p>
        )}

        {/* Result */}
        {result && (
          <div className="mt-6 bg-bn-card rounded-xl border border-bn-hairline overflow-hidden">
            <div className="px-6 py-3 border-b border-bn-hairline">
              <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide">
                Datos extraídos
              </h3>
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
