# Smoke check — Block 1.4 Backend integration

Environment: `USE_MOCK = false`, backend at http://localhost:3000,
frontend dev server at http://localhost:5173.
Backend version: PR #1 (dev-backend → main).

## API contract verification (curl)

All responses verified against `docs/api-contract.md`.

### Health
```
GET /api/health → 200
{"success":true,"data":{"status":"ok","timestamp":"2026-05-01T16:39:49.892Z"}}
✓ matches contract
```

### Auth — register
```
POST /api/auth/register {"email":"smoke@invoiceinsights.es","password":"smoketest123"}
→ 201 {"success":true,"data":{"token":"<jwt>","user":{"id":1,"email":"smoke@invoiceinsights.es","created_at":"..."}}}
✓ matches contract
```

### Auth — login
```
POST /api/auth/login (same credentials)
→ 200 same shape as register
✓ matches contract
```

### Analytics — summary (fresh user, all zeros)
```
GET /api/analytics/summary
→ 200 {"ingresos_totales":0,"gastos_totales":0,"beneficio_neto":0,...,"moneda":"EUR","periodo":{"desde":"2026-01-01","hasta":"2026-12-31"}}
✓ matches contract
```

### Analytics — monthly (12 months all zeros)
```
GET /api/analytics/monthly
→ 200 array of 12 MonthlyEntry objects (2025-06 through 2026-05), all ingresos/gastos = 0
✓ matches contract (no gaps, 12 entries)
```

### Analytics — clients (empty for fresh user)
```
GET /api/analytics/clients → 200 {"data":[]}
✓ matches contract
```

### Analytics — VAT (4 quarters all zeros)
```
GET /api/analytics/vat
→ 200 [T1,T2,T3,T4] all zeros for 2026
✓ matches contract
```

### Facturas — list (empty)
```
GET /api/facturas → 200 {"data":{"facturas":[]}}
✓ matches contract
```

### Facturas — upload
```
POST /api/facturas/upload (sample.pdf from backend/scripts/smoke/fixtures/)
→ 201 {
    "id":1, "numero":"F-SMOKE-001", "fecha":"2026-01-15",
    "emisor":"Test Empresa Servicios SL", "receptor":"Cliente Test Sistemas SL",
    "concepto":"Servicios de consultoria - enero 2026",
    "base_imponible":1000, "iva_porcentaje":21, "iva_cantidad":210,
    "irpf_porcentaje":15, "irpf_cantidad":150, "total":1060,
    "moneda":"EUR", "tipo":"ingreso", "created_at":"..."
  }
✓ matches contract — Azure AI extraction working
✓ PDF deleted from disk (GDPR invariant confirmed by backend log)
```

### Facturas — delete
```
DELETE /api/facturas/1
→ 200 {"success":true,"data":{"id":1}}
✓ matches contract
```

## CORS
```
OPTIONS /api/analytics/summary -H "Origin: http://localhost:5173"
Access-Control-Allow-Origin: http://localhost:5173   ✓
Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE   ✓
```
No CORS errors observed in browser console.

## Browser E2E (http://localhost:5173)

1. Register new account → lands on /dashboard showing zeroed KPIs and empty tables. ✓
2. Log out → redirected to /login. ✓
3. Log back in → /dashboard. ✓
4. Navigate to /upload → drop sample PDF → "Procesando…" → JSON rendered with
   extracted factura data. ✓
5. Navigate to /dashboard → KPIs updated (Ingresos 1.060,00 €, 1 factura). ✓
6. Click "Eliminar" on the row → confirm → row removed, KPIs zeroed. ✓

## Build
```
npm run typecheck  → 0 errors ✓
npm run build      → dist/ produced, 335 kB JS / 11 kB CSS ✓
```

## Result

All steps passed on: 2026-05-01 — commit b5cc9cf (USE_MOCK flip)
