# API Contract

> **This contract is immutable during development.** Any change must be agreed by both backend and frontend developers before any code is touched. The contract is the boundary between sides; an unilateral change silently breaks the other side.

## Conventions

### Response envelope

Every endpoint, success or error, returns one of:

```json
{ "success": true,  "data": <object | array> }
{ "success": false, "error": "<human-readable message>" }
```

HTTP status codes still carry meaning (`201`, `400`, `401`, `404`, `409`, `413`, `415`, `502`); the envelope is the body shape.

### Authentication

`Authorization: Bearer <jwt>` header on every endpoint **except**:
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`

### Field name language

Field names are in Spanish and map to Spanish tax form vocabulary. Do not anglicise them in either backend or frontend code. See the root `CLAUDE.md` Language section for the full list.

### Numeric types

All monetary amounts are JSON numbers with up to 2 decimal places (`base_imponible`, `iva_cantidad`, `irpf_cantidad`, `total`, `facturado`, `ingresos`, `gastos`, etc.). Percentages are integers or numbers (`iva_porcentaje: 21`, `irpf_porcentaje: 15`).

### Sign convention for IRPF

`irpf_porcentaje` and `irpf_cantidad` are **always positive** in storage, in the contract, and in the extractor output. The sign (subtraction from total) is applied in calculation logic. Never store or send negative IRPF values.

---

## Endpoints

### Health

#### `GET /api/health`

No auth.

Response 200:
```json
{ "success": true, "data": { "status": "ok", "timestamp": "2026-04-30T10:00:00.000Z" } }
```

---

### Auth

#### `POST /api/auth/register`

Request:
```json
{ "email": "user@example.com", "password": "min 8 chars" }
```

Response 201:
```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": { "id": 1, "email": "user@example.com", "created_at": "2026-04-30T10:00:00.000Z" }
  }
}
```

Errors:
- 400 — invalid email format or password too short.
- 409 — email already registered.

#### `POST /api/auth/login`

Request:
```json
{ "email": "user@example.com", "password": "..." }
```

Response 200: same shape as register.

Errors:
- 401 — invalid credentials. The error message must be the same regardless of whether the email exists or the password is wrong (no user enumeration).

---

### Facturas

#### `POST /api/facturas/upload`

Auth required. `multipart/form-data` with field name `file` containing a single PDF.

Limits:
- `Content-Type: application/pdf` only.
- 10 MB max.

Response 201 — `data` is the inserted factura:
```json
{
  "id": 42,
  "numero": "F-2026-001",
  "fecha": "2026-01-15",
  "emisor": "Empresa Emisora SL",
  "receptor": "Empresa Receptora SL",
  "concepto": "Consultoría enero 2026",
  "base_imponible": 1500.00,
  "iva_porcentaje": 21,
  "iva_cantidad": 315.00,
  "irpf_porcentaje": 15,
  "irpf_cantidad": 225.00,
  "total": 1590.00,
  "moneda": "EUR",
  "tipo": "ingreso",
  "created_at": "2026-04-30T10:00:00.000Z"
}
```

Errors:
- 400 — extraction or validation failed.
- 409 — duplicate `numero` for this user (UNIQUE constraint).
- 413 — file too large.
- 415 — not a PDF.
- 502 — Azure AI Foundry error.

**Invariant:** the uploaded PDF is deleted from disk before this endpoint returns, regardless of outcome. No PDF is ever persisted.

#### `GET /api/facturas`

Auth required.

Response 200:
```json
{
  "success": true,
  "data": {
    "facturas": [
      { "id": 42, "numero": "...", "fecha": "...", ... },
      ...
    ]
  }
}
```

Order: `fecha DESC, id DESC`.

#### `DELETE /api/facturas/:id`

Auth required. Scoped to the authenticated user — a user cannot delete another user's factura.

Response 200:
```json
{ "success": true, "data": { "id": 42 } }
```

Errors:
- 404 — factura does not exist or belongs to another user (same message — no enumeration).

---

### Analytics

All require auth. All wrap their payload in the standard envelope.

#### `GET /api/analytics/summary`

Response 200 — `data`:
```json
{
  "ingresos_totales": 19608.00,
  "gastos_totales": 889.50,
  "beneficio_neto": 18718.50,
  "iva_repercutido": 4117.68,
  "iva_soportado": 169.99,
  "iva_a_pagar": 3947.69,
  "irpf_retenido": 2865.00,
  "num_facturas": 10,
  "num_clientes": 4,
  "ticket_medio": 1960.80,
  "moneda": "EUR",
  "periodo": { "desde": "2026-01-01", "hasta": "2026-04-30" }
}
```

- `beneficio_neto = ingresos_totales - gastos_totales`.
- `iva_a_pagar = iva_repercutido - iva_soportado`.
- `irpf_retenido` is the sum of `irpf_cantidad` over income invoices (positive value, represents what clients withheld and will pay to the tax agency).
- `periodo` covers the data range present in the user's facturas (or the current fiscal year if more convenient — backend decides, but document the choice).

#### `GET /api/analytics/monthly`

Response 200 — `data` is an array of monthly buckets, last 12 months including the current one:

```json
[
  { "mes": "2025-11", "ingresos": 4200.00, "gastos": 215.00 },
  { "mes": "2025-12", "ingresos": 5100.00, "gastos": 198.00 },
  { "mes": "2026-01", "ingresos": 2400.00, "gastos": 600.00 },
  { "mes": "2026-02", "ingresos": 5000.00, "gastos": 0.00 }
]
```

- `mes` format: `YYYY-MM`.
- Months with no facturas appear with `0.00` for both fields. Do not skip months; the array always has 12 entries in chronological order.

#### `GET /api/analytics/clients`

Response 200 — `data` is an array of top clients by amount invoiced (income only, ordered by `facturado` desc):

```json
[
  { "cliente": "Telefónica Movistar SA", "facturado": 7200.00, "num_facturas": 3 },
  { "cliente": "Inditex SA", "facturado": 4500.00, "num_facturas": 1 }
]
```

- Default limit: 10.
- Source: facturas with `tipo = 'ingreso'`, grouped by `receptor` (the client being invoiced).

#### `GET /api/analytics/vat`

Response 200 — `data` is an array of 4 quarters of the current calendar year:

```json
[
  { "trimestre": "T1", "anio": 2026, "iva_repercutido": 2058.00, "iva_soportado": 169.99, "iva_a_pagar": 1888.01 },
  { "trimestre": "T2", "anio": 2026, "iva_repercutido": 882.00,  "iva_soportado": 4.62,   "iva_a_pagar": 877.38 },
  { "trimestre": "T3", "anio": 2026, "iva_repercutido": 0.00,    "iva_soportado": 0.00,   "iva_a_pagar": 0.00 },
  { "trimestre": "T4", "anio": 2026, "iva_repercutido": 0.00,    "iva_soportado": 0.00,   "iva_a_pagar": 0.00 }
]
```

- Empty quarters appear with zeros (do not skip).
- Quarter assignment by month: T1 = Jan–Mar, T2 = Apr–Jun, T3 = Jul–Sep, T4 = Oct–Dec.
- `iva_repercutido` = sum of `iva_cantidad` over income invoices in the quarter.
- `iva_soportado` = sum of `iva_cantidad` over expense invoices in the quarter.
- `iva_a_pagar = iva_repercutido - iva_soportado`.

---

## Extractor output (internal contract)

The output of `backend/src/services/extractor.js`, consumed by the upload route before the DB insert. This is **not** an HTTP shape but a function return shape. Documented here because both backend and frontend developers may want to look at it.

```json
{
  "numero": "F-2026-001",
  "fecha": "2026-01-15",
  "emisor": "Empresa Emisora SL",
  "receptor": "Empresa Receptora SL",
  "concepto": "Consultoría enero 2026",
  "base_imponible": 1500.00,
  "iva_porcentaje": 21,
  "iva_cantidad": 315.00,
  "irpf_porcentaje": 15,
  "irpf_cantidad": 225.00,
  "total": 1590.00,
  "moneda": "EUR",
  "tipo": "ingreso"
}
```

Validation rules the extractor enforces before returning:

- All fields present (no `null`/`undefined` for required fields).
- `fecha` matches `YYYY-MM-DD`.
- `tipo` ∈ `{"ingreso", "gasto"}`.
- `moneda` is a 3-letter ISO code (typically `"EUR"`).
- `total ≈ base_imponible + iva_cantidad - irpf_cantidad` within a 0.01 tolerance.
- `irpf_porcentaje >= 0` and `irpf_cantidad >= 0`.

If any rule fails, the extractor throws and the upload route returns 400.

`tipo` is determined by whether the authenticated user's identity matches the `emisor` (→ `ingreso`) or the `receptor` (→ `gasto`). For Phase 1 MVP the extractor may default `tipo` to `ingreso` and the upload route may override based on simple heuristics; document the heuristic in `LESSONS.md` if it gets non-trivial.
