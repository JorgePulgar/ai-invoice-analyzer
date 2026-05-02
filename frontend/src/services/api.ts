// HTTP layer for backend communication.
// When USE_MOCK = true, responses are read from /mock/data.json (served by Vite
// from public/) so the frontend can be developed independently of the backend.
//
// Every method returns the unwrapped `data` payload or throws an Error with the
// backend-provided message.

import type {
  AiSummary,
  AuthResponse,
  ClientEntry,
  DraftFactura,
  Factura,
  MonthlyEntry,
  Summary,
  VatEntry,
} from '../types';

const USE_MOCK = false; // flip to false when the backend is ready
const API_BASE = 'http://localhost:3000/api';
const MOCK_URL = '/mock/data.json';

interface MockData {
  auth: AuthResponse;
  facturas: Factura[];
  summary: Summary;
  monthly: MonthlyEntry[];
  clients: ClientEntry[];
  vat: VatEntry[];
  aiSummary: AiSummary;
}

let mockCache: MockData | null = null;
async function loadMock(): Promise<MockData> {
  if (!mockCache) {
    const res = await fetch(MOCK_URL);
    mockCache = (await res.json()) as MockData;
  }
  return mockCache;
}

const TOKEN_KEY = 'ii_token';
function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}
function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isMultipart = false,
): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (isMultipart) {
    payload = body as FormData;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: payload });
  const json = (await res.json().catch(() => ({}))) as ApiResponse<T>;

  if (!json.success) {
    throw new Error('error' in json ? json.error : `HTTP ${res.status}`);
  }
  return json.data;
}

export const api = {
  isAuthed(): boolean {
    return !!getToken();
  },

  // --- Auth ---
  async register(email: string, password: string): Promise<AuthResponse> {
    if (USE_MOCK) {
      const m = await loadMock();
      setToken(m.auth.token);
      return m.auth;
    }
    const data = await request<AuthResponse>('POST', '/auth/register', { email, password });
    setToken(data.token);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    if (USE_MOCK) {
      const m = await loadMock();
      setToken(m.auth.token);
      return m.auth;
    }
    const data = await request<AuthResponse>('POST', '/auth/login', { email, password });
    setToken(data.token);
    return data;
  },

  logout(): void {
    clearToken();
  },

  // --- Facturas ---
  async uploadFactura(file: File): Promise<Factura> {
    if (USE_MOCK) {
      const m = await loadMock();
      // Simulate latency so loading states are visible
      await new Promise((r) => setTimeout(r, 800));
      return m.facturas[0];
    }
    const fd = new FormData();
    fd.append('file', file);
    return request<Factura>('POST', '/facturas/upload', fd, true);
  },

  async listFacturas(): Promise<{ facturas: Factura[] }> {
    if (USE_MOCK) {
      const m = await loadMock();
      return { facturas: m.facturas };
    }
    return request<{ facturas: Factura[] }>('GET', '/facturas');
  },

  async deleteFactura(id: number): Promise<{ id: number }> {
    if (USE_MOCK) return { id };
    return request<{ id: number }>('DELETE', `/facturas/${id}`);
  },

  // --- Analytics ---
  async getSummary(): Promise<Summary> {
    if (USE_MOCK) return (await loadMock()).summary;
    return request<Summary>('GET', '/analytics/summary');
  },
  async getMonthly(): Promise<MonthlyEntry[]> {
    if (USE_MOCK) return (await loadMock()).monthly;
    return request<MonthlyEntry[]>('GET', '/analytics/monthly');
  },
  async getClients(): Promise<ClientEntry[]> {
    if (USE_MOCK) return (await loadMock()).clients;
    return request<ClientEntry[]>('GET', '/analytics/clients');
  },
  async getVat(): Promise<VatEntry[]> {
    if (USE_MOCK) return (await loadMock()).vat;
    return request<VatEntry[]>('GET', '/analytics/vat');
  },

  async getAiSummary(): Promise<AiSummary | null> {
    if (USE_MOCK) return (await loadMock()).aiSummary;
    // TODO(phase-2-backend): wire to GET /api/analytics/ai-summary once the
    // contract addendum is approved and Jorge ships the endpoint.
    return null;
  },

  // --- Phase 2 upload (extract → review → confirm) ---

  async extractFactura(file: File): Promise<DraftFactura> {
    if (USE_MOCK) {
      const m = await loadMock();
      await new Promise((r) => setTimeout(r, 800));
      const { id: _id, created_at: _ca, ...draft } = m.facturas[0];
      return draft;
    }
    const fd = new FormData();
    fd.append('file', file);
    const { draft } = await request<{ draft: Factura & { status: string } }>(
      'POST', '/facturas/upload', fd, true,
    );
    const { status: _s, created_at: _ca, ...fields } = draft;
    return fields;
  },

  async confirmFactura(draft: DraftFactura): Promise<Factura> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 300));
      return {
        ...draft,
        id: draft.id ?? Math.floor(Math.random() * 10000) + 100,
        created_at: new Date().toISOString(),
      };
    }
    const draftId = draft.id;
    if (!draftId) throw new Error('Cannot confirm: draft id missing');
    const { id: _id, ...body } = draft;
    return request<Factura>('POST', `/facturas/drafts/${draftId}/confirm`, body);
  },

  async discardDraft(id: number): Promise<void> {
    if (USE_MOCK) return;
    await request<{ id: number }>('DELETE', `/facturas/drafts/${id}`);
  },
};
