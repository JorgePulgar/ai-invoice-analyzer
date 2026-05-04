import { useState } from 'react';
import type { DraftFactura, Tipo } from '../types';

interface FacturaFormProps {
  initial: DraftFactura;
  onSubmit: (draft: DraftFactura) => void;
  onCancel: () => void;
  submitting: boolean;
}

interface FormErrors {
  numero?: string;
  fecha?: string;
  emisor?: string;
  receptor?: string;
  base_imponible?: string;
  total?: string;
  irpf?: string;
}

const inputClass =
  'w-full bg-bn-elevated border border-bn-hairline text-bn-body text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-bn-yellow/40 focus:border-bn-yellow transition-colors';

const labelClass = 'block text-xs font-medium text-bn-muted uppercase tracking-wide mb-1';

export function FacturaForm({ initial, onSubmit, onCancel, submitting }: FacturaFormProps) {
  const [draft, setDraft] = useState<DraftFactura>({ ...initial });
  const [errors, setErrors] = useState<FormErrors>({});

  function set<K extends keyof DraftFactura>(key: K, value: DraftFactura[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }

  function setNum(key: keyof DraftFactura, raw: string) {
    const n = parseFloat(raw);
    set(key, (isNaN(n) ? 0 : n) as DraftFactura[typeof key]);
  }

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!draft.numero.trim()) e.numero = 'Requerido';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.fecha)) e.fecha = 'Formato YYYY-MM-DD';
    if (!draft.emisor.trim()) e.emisor = 'Requerido';
    if (!draft.receptor.trim()) e.receptor = 'Requerido';
    if (draft.base_imponible < 0) e.base_imponible = 'No puede ser negativo';
    if (draft.total < 0) e.total = 'No puede ser negativo';
    if (draft.irpf_porcentaje < 0 || draft.irpf_cantidad < 0)
      e.irpf = 'El IRPF debe ser ≥ 0';
    return e;
  }

  const totalMismatch =
    Math.abs(draft.total - (draft.base_imponible + draft.iva_cantidad - draft.irpf_cantidad)) >
    0.01;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    onSubmit(draft);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 bg-bn-card rounded-xl border border-bn-hairline overflow-hidden">
      <div className="px-6 py-4 border-b border-bn-hairline flex items-center justify-between">
        <h3 className="text-xs font-semibold text-bn-muted uppercase tracking-wide">
          Revisar datos extraídos
        </h3>
        <span className="text-xs text-bn-muted">Corrige cualquier campo antes de guardar</span>
      </div>

      <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Number */}
        <div>
          <label className={labelClass}>Número *</label>
          <input
            type="text"
            value={draft.numero}
            onChange={(e) => set('numero', e.target.value)}
            className={inputClass}
          />
          {errors.numero && <p className="text-xs text-bn-down mt-1">{errors.numero}</p>}
        </div>

        {/* Date */}
        <div>
          <label className={labelClass}>Fecha *</label>
          <input
            type="date"
            value={draft.fecha}
            onChange={(e) => set('fecha', e.target.value)}
            className={inputClass}
          />
          {errors.fecha && <p className="text-xs text-bn-down mt-1">{errors.fecha}</p>}
        </div>

        {/* Issuer */}
        <div>
          <label className={labelClass}>Emisor *</label>
          <input
            type="text"
            value={draft.emisor}
            onChange={(e) => set('emisor', e.target.value)}
            className={inputClass}
          />
          {errors.emisor && <p className="text-xs text-bn-down mt-1">{errors.emisor}</p>}
        </div>

        {/* Recipient */}
        <div>
          <label className={labelClass}>Receptor *</label>
          <input
            type="text"
            value={draft.receptor}
            onChange={(e) => set('receptor', e.target.value)}
            className={inputClass}
          />
          {errors.receptor && <p className="text-xs text-bn-down mt-1">{errors.receptor}</p>}
        </div>

        {/* Description */}
        <div className="sm:col-span-2">
          <label className={labelClass}>Concepto</label>
          <input
            type="text"
            value={draft.concepto ?? ''}
            onChange={(e) => set('concepto', e.target.value || null)}
            className={inputClass}
          />
        </div>

        {/* Tax base */}
        <div>
          <label className={labelClass}>Base imponible (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.base_imponible}
            onChange={(e) => setNum('base_imponible', e.target.value)}
            className={inputClass}
          />
          {errors.base_imponible && (
            <p className="text-xs text-bn-down mt-1">{errors.base_imponible}</p>
          )}
        </div>

        {/* VAT % */}
        <div>
          <label className={labelClass}>IVA %</label>
          <input
            type="number"
            step="1"
            min="0"
            value={draft.iva_porcentaje}
            onChange={(e) => setNum('iva_porcentaje', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* VAT amount */}
        <div>
          <label className={labelClass}>IVA (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.iva_cantidad}
            onChange={(e) => setNum('iva_cantidad', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* WHT % */}
        <div>
          <label className={labelClass}>IRPF %</label>
          <input
            type="number"
            step="1"
            min="0"
            value={draft.irpf_porcentaje}
            onChange={(e) => setNum('irpf_porcentaje', e.target.value)}
            className={inputClass}
          />
          {errors.irpf && <p className="text-xs text-bn-down mt-1">{errors.irpf}</p>}
        </div>

        {/* WHT amount */}
        <div>
          <label className={labelClass}>IRPF (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.irpf_cantidad}
            onChange={(e) => setNum('irpf_cantidad', e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Total */}
        <div>
          <label className={labelClass}>Total (€) *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={draft.total}
            onChange={(e) => setNum('total', e.target.value)}
            className={inputClass}
          />
          {errors.total && <p className="text-xs text-bn-down mt-1">{errors.total}</p>}
          {totalMismatch && !errors.total && (
            <p className="text-xs text-bn-yellow mt-1">
              El total no coincide: revisa IVA / IRPF
            </p>
          )}
        </div>

        {/* Currency */}
        <div>
          <label className={labelClass}>Moneda</label>
          <select
            value={draft.moneda}
            onChange={(e) => set('moneda', e.target.value)}
            className={inputClass}
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
          </select>
        </div>

        {/* Type */}
        <div>
          <label className={labelClass}>Tipo</label>
          <select
            value={draft.tipo}
            onChange={(e) => set('tipo', e.target.value as Tipo)}
            className={inputClass}
          >
            <option value="ingreso">Ingreso</option>
            <option value="gasto">Gasto</option>
          </select>
        </div>
      </div>

      <div className="px-6 py-4 border-t border-bn-hairline flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="text-sm font-medium text-bn-muted-strong hover:text-bn-body transition-colors disabled:opacity-50"
        >
          Descartar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="text-sm font-semibold bg-bn-yellow text-bn-ink px-5 py-2 rounded hover:bg-bn-yellow-hover transition-colors disabled:bg-bn-yellow-dim disabled:text-bn-muted disabled:cursor-not-allowed"
        >
          {submitting ? 'Guardando…' : 'Confirmar y guardar'}
        </button>
      </div>
    </form>
  );
}
