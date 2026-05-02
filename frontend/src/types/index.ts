// Types derived from docs/api-contract.md.
// Field names follow the Spanish fiscal-vocabulary exception (numero, fecha,
// base_imponible, iva_*, irpf_*, tipo, etc.) — do not anglicise them.

export type Tipo = 'ingreso' | 'gasto';

export interface Factura {
  id: number;
  numero: string;
  fecha: string;
  emisor: string;
  receptor: string;
  concepto: string | null;
  base_imponible: number;
  iva_porcentaje: number;
  iva_cantidad: number;
  irpf_porcentaje: number;
  irpf_cantidad: number;
  total: number;
  moneda: string;
  tipo: Tipo;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Summary {
  ingresos_totales: number;
  gastos_totales: number;
  beneficio_neto: number;
  iva_repercutido: number;
  iva_soportado: number;
  iva_a_pagar: number;
  irpf_retenido: number;
  num_facturas: number;
  num_clientes: number;
  ticket_medio: number;
  moneda: string;
  periodo: { desde: string; hasta: string };
}

export interface MonthlyEntry {
  mes: string;
  ingresos: number;
  gastos: number;
}

export interface ClientEntry {
  cliente: string;
  facturado: number;
  num_facturas: number;
}

export interface VatEntry {
  trimestre: string;
  anio: number;
  iva_repercutido: number;
  iva_soportado: number;
  iva_a_pagar: number;
}

export interface AiSummary {
  narrative: string;
  generated_at: string;
}

export type DraftFactura = Omit<Factura, 'id' | 'created_at'> & { id?: number };
