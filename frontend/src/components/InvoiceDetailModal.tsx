import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { DraftFactura, Factura } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { FacturaForm } from './FacturaForm';
import { TipoBadge } from './TipoBadge';
import { formatCurrency, formatDate } from '../utils/format';

interface InvoiceDetailModalProps {
  factura: Factura;
  onClose: () => void;
  onSaved: (updated: Factura) => void;
  onDelete: (id: number) => Promise<void>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-bn-hairline last:border-0">
      <span className="text-xs text-bn-muted font-medium uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm text-bn-body text-right">{value}</span>
    </div>
  );
}

export function InvoiceDetailModal({ factura, onClose, onSaved, onDelete }: InvoiceDetailModalProps) {
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [submitting, setSubmitting] = useState(false);
  const { success, error } = useToast();

  const handleSave = async (draft: DraftFactura) => {
    setSubmitting(true);
    try {
      const updated = await api.updateFactura(factura.id, draft);
      success('Factura actualizada');
      onSaved(updated);
    } catch (err) {
      error(err instanceof Error ? err.message : 'No se pudo guardar la factura');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar factura ${factura.numero}?`)) return;
    try {
      await onDelete(factura.id);
    } catch (err) {
      error(err instanceof Error ? err.message : 'No se pudo eliminar la factura');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const draft: DraftFactura = (({ id: _id, created_at: _ca, ...rest }) => rest)(factura);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] p-4 bg-black/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-bn-card border border-bn-hairline rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scaleIn max-h-[84vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {mode === 'view' ? (
          <>
            <div className="px-6 py-4 border-b border-bn-hairline flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-semibold text-bn-body truncate">{factura.numero}</span>
                <TipoBadge tipo={factura.tipo} />
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="text-bn-muted hover:text-bn-body transition-colors text-xl leading-none shrink-0"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 overflow-y-auto flex-1">
              <Field label="Fecha" value={formatDate(factura.fecha)} />
              <Field label="Emisor" value={factura.emisor} />
              <Field label="Receptor" value={factura.receptor} />
              {factura.concepto && <Field label="Concepto" value={factura.concepto} />}
              <Field label="Base imponible" value={formatCurrency(factura.base_imponible, factura.moneda)} />
              <Field label={`IVA (${factura.iva_porcentaje}%)`} value={formatCurrency(factura.iva_cantidad, factura.moneda)} />
              <Field label={`IRPF (${factura.irpf_porcentaje}%)`} value={formatCurrency(factura.irpf_cantidad, factura.moneda)} />
              <Field label="Total" value={formatCurrency(factura.total, factura.moneda)} />
              <Field label="Moneda" value={factura.moneda} />
            </div>

            <div className="px-6 py-4 border-t border-bn-hairline flex items-center justify-between gap-3">
              <button
                onClick={handleDelete}
                className="text-sm font-medium text-bn-muted hover:text-bn-down transition-colors"
              >
                Eliminar
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="text-sm font-medium text-bn-muted-strong hover:text-bn-body transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => setMode('edit')}
                  className="text-sm font-semibold bg-bn-yellow text-bn-ink px-4 py-1.5 rounded hover:bg-bn-yellow-hover transition-colors"
                >
                  Editar
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="overflow-y-auto flex-1">
            <FacturaForm
              initial={draft}
              onSubmit={handleSave}
              onCancel={() => setMode('view')}
              submitting={submitting}
            />
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
