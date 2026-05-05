import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toggleTheme } from '../utils/theme';
import type { ClientEntry, Factura, SupplierEntry } from '../types';
import { formatCurrency } from '../utils/format';

interface Command {
  id: string;
  label: string;
  description?: string;
  action: () => void;
}

interface CommandPaletteProps {
  facturas: Factura[];
  clients: ClientEntry[];
  suppliers: SupplierEntry[];
  onClose: () => void;
  onThemeChange?: () => void;
  onSelectFactura?: (factura: Factura) => void;
}

const SECTIONS = [
  { id: 'section-kpis', label: 'Sección: KPIs' },
  { id: 'section-monthly', label: 'Sección: Evolución mensual' },
  { id: 'section-top', label: 'Sección: Top clientes y proveedores' },
  { id: 'section-distribution', label: 'Sección: Distribución de ingresos / gastos' },
  { id: 'section-vat', label: 'Sección: IVA trimestral' },
  { id: 'section-vat-table', label: 'Sección: Tabla de IVA' },
  { id: 'section-cashflow', label: 'Sección: Flujo de caja y margen' },
  { id: 'section-insights', label: 'Sección: Insights' },
  { id: 'section-heatmap', label: 'Sección: Mapa de actividad' },
  { id: 'section-facturas', label: 'Sección: Facturas' },
];

export function CommandPalette({
  facturas,
  clients,
  suppliers,
  onClose,
  onThemeChange,
  onSelectFactura,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const staticCommands: Command[] = useMemo(() => [
    {
      id: 'nav-dashboard',
      label: 'Ir al panel',
      description: 'Dashboard principal',
      action: () => { navigate('/dashboard'); onClose(); },
    },
    {
      id: 'nav-upload',
      label: 'Subir factura',
      description: 'Subir nueva factura PDF',
      action: () => { navigate('/upload'); onClose(); },
    },
    {
      id: 'clear-filters',
      label: 'Limpiar filtros',
      description: 'Restablecer todos los filtros',
      action: () => { navigate('/dashboard', { replace: true }); onClose(); },
    },
    {
      id: 'theme-toggle',
      label: 'Cambiar tema',
      description: 'Alternar modo oscuro / claro',
      action: () => { toggleTheme(); onThemeChange?.(); onClose(); },
    },
    {
      id: 'logout',
      label: 'Cerrar sesión',
      action: () => { logout(); navigate('/login'); onClose(); },
    },
  ], [navigate, logout, onClose, onThemeChange]);

  const sectionCommands: Command[] = useMemo(() => {
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
    return SECTIONS.map(({ id, label }) => ({
      id: `cmd-${id}`,
      label,
      action: () => {
        document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
        onClose();
      },
    }));
  }, [onClose]);

  const clientCommands: Command[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return clients
      .filter((c) => c.cliente.toLowerCase().includes(q))
      .slice(0, 3)
      .map((c) => ({
        id: `client-${c.cliente}`,
        label: `Cliente: ${c.cliente}`,
        description: formatCurrency(c.facturado),
        action: () => { navigate(`/dashboard?cliente=${encodeURIComponent(c.cliente)}`); onClose(); },
      }));
  }, [query, clients, navigate, onClose]);

  const supplierCommands: Command[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return suppliers
      .filter((s) => s.proveedor.toLowerCase().includes(q))
      .slice(0, 3)
      .map((s) => ({
        id: `supplier-${s.proveedor}`,
        label: `Proveedor: ${s.proveedor}`,
        description: formatCurrency(s.gastado),
        action: () => { navigate(`/dashboard?proveedor=${encodeURIComponent(s.proveedor)}`); onClose(); },
      }));
  }, [query, suppliers, navigate, onClose]);

  const facturaCommands: Command[] = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return facturas
      .filter(
        (f) =>
          f.numero.toLowerCase().includes(q) ||
          f.emisor.toLowerCase().includes(q) ||
          f.receptor.toLowerCase().includes(q),
      )
      .slice(0, 5)
      .map((f) => ({
        id: `factura-${f.id}`,
        label: f.numero,
        description: `${f.emisor} · ${f.tipo}`,
        action: () => { onSelectFactura?.(f); onClose(); },
      }));
  }, [query, facturas, onClose, onSelectFactura]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const matchingStatic = q
      ? staticCommands.filter(
          (c) =>
            c.label.toLowerCase().includes(q) ||
            (c.description?.toLowerCase().includes(q) ?? false),
        )
      : staticCommands;
    const matchingSections = q
      ? sectionCommands.filter((c) => c.label.toLowerCase().includes(q))
      : sectionCommands;
    return [...matchingStatic, ...clientCommands, ...supplierCommands, ...facturaCommands, ...matchingSections];
  }, [query, staticCommands, sectionCommands, clientCommands, supplierCommands, facturaCommands]);

  const safeCursor = Math.min(cursor, Math.max(0, filtered.length - 1));

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    const item = listRef.current?.children[safeCursor] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [safeCursor]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      filtered[safeCursor]?.action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] p-4 bg-black/40 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-bn-card border border-bn-hairline rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-bn-hairline">
          <div className="flex flex-col gap-0.5 shrink-0">
            <kbd className="text-[10px] text-bn-muted bg-bn-elevated border border-bn-hairline px-1 py-px rounded leading-none">⌘K</kbd>
            <kbd className="text-[10px] text-bn-muted bg-bn-elevated border border-bn-hairline px-1 py-px rounded leading-none">Ctrl+K</kbd>
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar comandos, facturas, secciones…"
            className="flex-1 bg-transparent text-sm text-bn-body placeholder:text-bn-muted focus:outline-none"
          />
          <kbd className="text-xs text-bn-muted bg-bn-elevated border border-bn-hairline px-1.5 py-0.5 rounded">
            Esc
          </kbd>
        </div>

        {filtered.length > 0 ? (
          <ul ref={listRef} className="max-h-72 overflow-y-auto py-2">
            {filtered.map((cmd, i) => (
              <li key={cmd.id}>
                <button
                  onClick={cmd.action}
                  onMouseEnter={() => setCursor(i)}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                    i === safeCursor ? 'bg-bn-elevated' : 'hover:bg-bn-elevated'
                  }`}
                >
                  <span className="text-sm font-medium text-bn-body">{cmd.label}</span>
                  {cmd.description && (
                    <span className="text-xs text-bn-muted ml-auto">{cmd.description}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-bn-muted text-center py-8">Sin resultados</p>
        )}
      </div>
    </div>
  );
}
