# Smoke check — Block 1.2 Dashboard

Environment: `USE_MOCK = true`, dev server at http://localhost:5173

## Pre-condition

Log in (or register) to reach the dashboard. The page fetches all data via
`Promise.all` on mount using mock data from `/mock/data.json`.

## Steps

### KPIs

1. Navigate to http://localhost:5173/dashboard.
   - Expected: 4 KPI cards visible in a 2×2 (mobile) or 4-column (desktop) grid.
   - Expected values from mock data:
     - Ingresos totales: 19.608,00 €
     - Gastos totales: 889,50 €
     - Beneficio neto: 18.718,50 €
     - IVA a pagar: 3.947,69 €

### Monthly chart

2. Scroll to the "Evolución mensual" section.
   - Expected: a bar chart with two datasets (green = Ingresos, red = Gastos).
   - Expected: 6 month labels visible (2025-11 through 2026-04).
   - Expected: y-axis ticks formatted as currency (e.g. "5.000,00 €").
   - Expected: hovering a bar shows a tooltip with the currency-formatted value.

### Top clients

3. Check the "Principales clientes" panel.
   - Expected: 4 rows numbered 1–4.
   - Expected top client: Telefónica Movistar SA — 7.200,00 € (3 facturas).

### VAT table

4. Check the "IVA trimestral" table.
   - Expected: 4 rows (T1 2026 through T4 2026).
   - T1 row: Repercutido 2.058,00 € / Soportado 169,99 € / A pagar 1.888,01 €.
   - T3 and T4 show all zeros (no facturas in those quarters in mock data).

### Facturas table

5. Check the "Facturas" table.
   - Expected: 10 rows matching the mock data.
   - Expected: tipo column shows "Ingreso" (green) or "Gasto" (red).
   - Expected: total column formatted as currency.
   - Expected: fecha column formatted as dd/mm/yyyy.

### Delete

6. Click "Eliminar" on any row → confirm dialog appears with the factura number.
   - Confirm deletion.
   - Expected: that row disappears from the table.
   - Note: deletion is mock-only — reloading the page restores all rows.

### Loading state

7. Hard-refresh the page (Ctrl+F5).
   - Expected: "Cargando…" text visible briefly before data appears.

### Error path (optional, requires temporarily breaking the mock)

8. In `src/services/api.ts`, temporarily change `MOCK_URL` to a bad path,
   restart dev server, and navigate to /dashboard.
   - Expected: error message displayed in red, no crash.
   - Revert the change afterwards.

## Result

All steps passed on: <!-- fill in date and commit sha -->
