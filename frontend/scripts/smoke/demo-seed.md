# Smoke Checklist — Demo Seed (Block 4.1)

## Setup

1. Start backend: `cd backend && npm start` (http://localhost:3000)
2. Confirm seed ran: `node backend/scripts/seed.js` (creates demo account with 30 invoices)
3. Start frontend: `cd frontend && npm run dev` (http://localhost:5173)
4. Log in as: `demo@invoice-insights.com` / `demo1234`

## Checklist

### KPI row (7 cards)

- [ ] Ingresos totales — non-zero value
- [ ] Gastos totales — non-zero value
- [ ] Beneficio neto — non-zero value
- [ ] IVA a pagar — non-zero value
- [ ] IRPF Retenido — non-zero value
- [ ] Ticket Medio — non-zero value
- [ ] Num. Facturas — shows 30 (or seed count)

### MonthlyChart (Evolución mensual)

- [ ] Bar chart renders with Ingresos + Gastos bars
- [ ] Beneficio neto line visible across ≥ 6 months
- [ ] Forecast months appended with * suffix when no filters active

### TopClientsList / TopSuppliersList

- [ ] At least 3 clients listed with amounts
- [ ] At least 3 suppliers listed with amounts
- [ ] Both cards same height when in 2-col grid

### Doughnut charts

- [ ] RevenueChart (Ingresos por cliente) — multiple segments, no "Sin datos"
- [ ] ExpenseCategoriesChart (Categorías de gasto) — multiple segments, no "Sin datos"

### VatChart + VatTable

- [ ] VatChart: at least 2 quarters with non-zero bars
- [ ] VatTable: 4 rows shown, amounts match chart

### IrpfWidget

- [ ] Non-zero IRPF amount displayed

### CashFlowChart + ProfitMarginChart

- [ ] Smooth curves across ≥ 6 months
- [ ] No charts clipped or overflowing

### InsightsPanel

- [ ] At least 2 insights shown (Análisis automático section)

### InvoiceHeatmap (Actividad de facturación)

- [ ] Activity cells visible across multiple months
- [ ] Tooltip shows count and date on hover

### AlertsBanner

- [ ] At least 1 alert shown (if applicable given seed date/data)
- [ ] Dismiss button hides individual alert
- [ ] Dismissed state persists on page reload

### Filters

- [ ] Quick-filter presets update dashboard data
- [ ] Tipo filter (Ingresos/Gastos) updates all KPIs and charts
- [ ] Clear button resets all filters

### Dark/light toggle

- [ ] Toggle button (☀/☾) in nav bar
- [ ] Theme persists on page reload

### Export

- [ ] "Exportar PDF" button visible in dashboard header
- [ ] Ctrl+P / clicking button opens print dialog
- [ ] Nav and filters hidden in print preview

### Upload flow

- [ ] Upload page accessible at /subir
- [ ] Upload a real PDF → data extracted and draft shown
- [ ] Confirm → invoice appears in dashboard

## Result

| Section | Pass / Fail | Notes |
|---|---|---|
| KPI row | | |
| MonthlyChart | | |
| TopClientsList/Suppliers | | |
| Doughnuts | | |
| VatChart + Table | | |
| IrpfWidget | | |
| CashFlowChart + Margin | | |
| InsightsPanel | | |
| InvoiceHeatmap | | |
| AlertsBanner | | |
| Filters | | |
| Dark/light toggle | | |
| Export | | |
| Upload flow | | |
