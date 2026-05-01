# TASKS — Frontend

Work queue for the frontend developer. Follow the per-task and per-block flows from the root `CLAUDE.md`.

All Phase 1 tasks operate against `/mock/data.json` (`USE_MOCK = true` in `src/services/api.ts`) until the corresponding backend endpoint is ready. Block 1.4 flips the flag and validates against the live backend.

Before starting any task, run `npm install` once to pull dependencies.

## Phase 1 — MVP

### Block 1.1 — Authentication UI

- [x] Implement login form
  - File: `src/pages/LoginPage.tsx`
  - Controlled inputs for email and password (`useState`).
  - On submit, call `useAuth().login(email, password)`. On success, `useNavigate('/dashboard')`. On error, render `err.message` inline.
  - Client-side validation: email format (`type="email"`), password ≥ 8 chars.
- [x] Implement register form
  - Same file. Toggle between login and register sections via local state (no separate route).
  - On submit, call `useAuth().register(email, password)`.
- [x] Verify auth-state redirection
  - Visiting `/login` while authed → redirects to `/dashboard` (already wired via `LoginPage`).
  - Visiting `/dashboard` or `/upload` while not authed → redirects to `/login` (already wired via `ProtectedRoute`).
- [x] Verify logout
  - `Layout` already wires the logout button. Confirm clicking it clears the token and lands on `/login`.
- [x] Smoke check
  - File: `scripts/smoke/auth.md` (manual checklist) — committed and referenced in the commit body.
  - Steps: register → land on dashboard → logout → land on login → login with same email → land on dashboard.

**Block 1.1 closes with**: `git push origin dev-frontend`.

---

### Block 1.2 — Dashboard

Pre-requisite: Block 1.1 complete. Uses mock data for all endpoints.

- [x] Create `KpiCard` component
  - File: `src/components/KpiCard.tsx`
  - Props: `{ label: string; value: string }`. Renders a card with label and value using Tailwind.
- [x] Create `MonthlyChart` component
  - File: `src/components/MonthlyChart.tsx`
  - Props: `{ data: MonthlyEntry[] }`.
  - Use `<Bar>` from `react-chartjs-2` with two datasets (`ingresos`, `gastos`). Register Chart.js components inside this file.
  - Format y-axis ticks as currency via `formatCurrency`.
- [x] Create `TopClientsList` component
  - File: `src/components/TopClientsList.tsx`
  - Props: `{ clients: ClientEntry[] }`. Renders an ordered list "Cliente — €X (N facturas)".
- [x] Create `VatTable` component
  - File: `src/components/VatTable.tsx`
  - Props: `{ vat: VatEntry[] }`. Renders a 4-row table with quarter labels (`T1 2026`, etc.).
- [x] Create `FacturasTable` component
  - File: `src/components/FacturasTable.tsx`
  - Props: `{ facturas: Factura[]; onDelete: (id: number) => void }`.
  - Each row has a delete button calling `onDelete(id)`. Use `formatCurrency` for the total column and `formatDate` for `fecha`.
- [x] Wire the dashboard page
  - File: `src/pages/DashboardPage.tsx`
  - On mount (`useEffect`), call `Promise.all([api.getSummary(), api.getMonthly(), api.getClients(), api.getVat(), api.listFacturas()])`. Store each in its own `useState`.
  - Render the 5 sections via the components above.
  - Wire `handleDelete = async (id) => { await api.deleteFactura(id); /* re-fetch facturas */ }`.
  - Show a loading state while the initial fetch is pending and an error message if anything throws.
- [x] Smoke check
  - File: `scripts/smoke/dashboard.md` (manual checklist).
  - Verify: 4 KPIs populated, chart renders with both datasets, top clients listed, VAT table shows 4 rows, facturas table renders mock entries, delete removes a row.

**Block 1.2 closes with**: `git push origin dev-frontend`.

---

### Block 1.3 — Upload page

Pre-requisite: Block 1.1 complete. Block 1.2 is not required.

- [x] Create `DropZone` component
  - File: `src/components/DropZone.tsx`
  - Props: `{ onFile: (file: File) => void; disabled?: boolean }`.
  - Wire `onDragEnter`, `onDragOver`, `onDragLeave`, `onDrop`. Visual state via Tailwind classes (`border-dashed`, `border-blue-500` on drag-over). Include a "Seleccionar archivo" button that opens a hidden `<input type="file" accept="application/pdf">`.
- [x] Wire the upload page
  - File: `src/pages/UploadPage.tsx`
  - Render `<DropZone>`, a status area, and a result area (initially hidden).
  - On file: client-side validation (mime `application/pdf` AND `.pdf` extension; size ≤ 10 MB). Reject with inline error.
  - On valid file: set status "Procesando…", `disabled={true}` on DropZone, call `api.uploadFactura(file)`. On success, render the extracted JSON pretty-printed in the result area and update status to "Subido correctamente". On error, show `err.message`. Re-enable DropZone in either case.
- [x] Smoke check
  - File: `scripts/smoke/upload.md` (manual checklist).
  - Verify: drop a PDF → loading state visible (~800 ms with mock) → JSON renders. Drop a non-PDF → error. Drop a > 10 MB file → error.

**Block 1.3 closes with**: `git push origin dev-frontend`.

---

### Block 1.4 — Backend integration

Pre-requisite: Backend Phase 1 complete (all backend blocks merged into `main` or accessible on `dev-backend`).

- [x] Flip `USE_MOCK = false` in `src/services/api.ts`
  - One commit dedicated to this flip, with a body stating which backend version is being targeted.
- [x] End-to-end manual test
  - Start backend (`http://localhost:3000`), run `npm run dev` (frontend at `http://localhost:5173`), walk through register → upload (real PDF) → dashboard.
  - For every step, verify the actual response shape matches `docs/api-contract.md`.
  - If anything diverges, **stop and coordinate with the backend developer.** Do not adapt the frontend silently.
- [x] CORS sanity check
  - Confirm backend `CORS_ORIGIN` includes `http://localhost:5173`.
  - If a CORS error appears, document it in `docs/LESSONS.md` and resolve it with the backend dev.
- [x] Run `npm run typecheck` and `npm run build` to confirm production build succeeds.
- [x] Smoke check
  - File: `scripts/smoke/integration.md` (manual checklist with steps and outcomes captured).

**Block 1.4 closes with**: `git push origin dev-frontend`. **End of Phase 1.** Open a PR from `dev-frontend` to `main` summarising the phase.

---

## Phase 2

### Block 2.1 — Enhanced dashboard KPIs & charts

Pre-requisite: Phase 1 merged to `main`. No backend changes required — all data is already available in existing endpoints.

- [ ] Expand KPI row in `DashboardPage`
  - Add cards for `irpf_retenido`, `ticket_medio`, `num_facturas`, `num_clientes` (all from `/api/analytics/summary`).
  - Add a period badge above the KPI row: `Analizando: {periodo.desde} → {periodo.hasta}`. Style as a small muted chip.
- [ ] Add month-over-month trend indicators to KPI cards
  - Update `KpiCard` props: `{ label, value, trend?: { pct: number; direction: 'up' | 'down' | 'neutral' } }`.
  - Compute trends client-side from the monthly array (current month vs previous month). Pass `neutral` when no previous month exists.
  - Render `↑ +X%` / `↓ -X%` below the value in green/red/grey respectively.
- [ ] Upgrade `MonthlyChart` to combo chart
  - Add a third dataset: net profit line (`ingresos - gastos`). Use `type: 'line'` on the same chart instance.
  - Keep existing income/expense bar datasets unchanged.
- [ ] Add `CashFlowChart` component
  - File: `src/components/CashFlowChart.tsx`.
  - Area chart of `ingresos - gastos` per month, computed client-side from the monthly array.
  - Positive area in green, negative in red (use Chart.js segment colouring or a single dataset with conditional fill).
- [ ] Add `ProfitMarginChart` component
  - File: `src/components/ProfitMarginChart.tsx`.
  - Line chart of `((ingresos - gastos) / ingresos) * 100` per month. Skip months where `ingresos === 0` (render gap, not zero).
- [ ] Add `RevenueDonutChart` component
  - File: `src/components/RevenueDonutChart.tsx`.
  - Doughnut chart from `/api/analytics/clients` (`cliente`, `facturado`). Fetch in the existing `Promise.all` in `DashboardPage`.
- [ ] Add `VatChart` component
  - File: `src/components/VatChart.tsx`.
  - Stacked bar chart of `iva_repercutido`, `iva_soportado`, `iva_a_pagar` per quarter from `/api/analytics/vat`.
  - Keep `VatTable` alongside it or replace it — your choice, but at least the chart must be present.
- [ ] Add IRPF summary widget
  - Simple block in the tax section: "IRPF retenido por clientes: €X". Uses `irpf_retenido` from summary.
- [ ] Smoke check
  - File: `scripts/smoke/dashboard-enhanced.md`. Walk through each new card, chart, and widget with real backend data. Capture outcomes.

**Block 2.1 closes with**: `git push origin dev-frontend`.

---

### Block 2.2 — Filters & invoice search

Pre-requisite: Backend Block 2.1 complete (`desde`/`hasta` params and factura filters available).

- [ ] Create `DashboardFilters` component
  - File: `src/components/DashboardFilters.tsx`.
  - Props: `{ value: DateRange; onChange: (r: DateRange) => void }` where `DateRange = { desde: string; hasta: string }`.
  - Preset buttons: "Últimos 30 días", "Últimos 3 meses", "Este año", "Año anterior", "Personalizado".
  - Custom range: two `<input type="date">` fields, shown only when "Personalizado" is selected.
  - Add type to `src/types/index.ts`.
- [ ] Wire `DashboardFilters` into `DashboardPage`
  - Lift filter state to `DashboardPage`. On change, re-fetch all analytics endpoints passing `desde`/`hasta`.
  - Do not re-fetch on every keystroke for custom range — re-fetch on blur or an explicit "Aplicar" button.
- [ ] Add search & filter bar to `FacturasTable`
  - Props: no change to `FacturasTable` signature — filter state lives in `DashboardPage` and a filtered list is passed down.
  - Add a filter row above the table: text input (searches `emisor` + `receptor`), type toggle (`Todos | Ingresos | Gastos`), minimum amount input.
  - All filtering is client-side on the already-fetched `facturas` list. No additional API call.
- [ ] Smoke check
  - File: `scripts/smoke/filters.md`. Verify presets update all charts, custom range applies, table search narrows rows, clearing filters restores full view.

**Block 2.2 closes with**: `git push origin dev-frontend`.

---

### Block 2.3 — Automatic indicators panel

Pre-requisite: Block 2.1 complete (all dashboard data available).

- [ ] Create `IndicadoresPanel` component
  - File: `src/components/IndicadoresPanel.tsx`.
  - Receives `{ summary, monthly, clients }` as props. Computes 3–5 rule-based insights client-side. Examples:
    - "El cliente principal representa el X% de los ingresos totales."
    - "Los gastos subieron un X% respecto al mes anterior."
    - "Valor medio de factura este mes: €X."
    - "Llevas N facturas sin gastos registrados." (if `gastos_totales === 0`)
  - Label the section **"Indicadores automáticos"** — not "IA" or "AI".
  - Only render insights for which the underlying data is non-zero/non-null. Never show divide-by-zero results.
- [ ] Add period-over-period KPI comparison
  - Extend the trend computation from Block 2.1: compare the sum of the current filter period against the same-length previous period, both derived from the monthly array.
  - Update `KpiCard` to also show an absolute delta (`+€X`) alongside the percentage.
- [ ] Smoke check
  - File: `scripts/smoke/indicators.md`. Verify all rendered insight strings are non-empty and percentages are finite numbers. Verify no insight renders when the relevant metric is zero.

**Block 2.3 closes with**: `git push origin dev-frontend`.

---

### Block 2.4 — Top Suppliers section

Pre-requisite: Backend Block 2.1 complete (`GET /api/analytics/suppliers` available).

- [ ] Add `SupplierEntry` type and `getSuppliers` method
  - File: `src/types/index.ts` → `interface SupplierEntry { proveedor: string; gastado: number; num_facturas: number }`.
  - File: `src/services/api.ts` → `getSuppliers()` method (real + mock paths). Add mock data to `public/mock/data.json`.
- [ ] Create `TopSuppliersList` component
  - File: `src/components/TopSuppliersList.tsx`.
  - Mirrors `TopClientsList`. Renders "Proveedor — €X (N facturas)" per row. Use `formatCurrency`.
- [ ] Wire into `DashboardPage`
  - Add `getSuppliers()` to the `Promise.all` fetch. Render `<TopSuppliersList>` alongside `<TopClientsList>`.
- [ ] Smoke check
  - File: `scripts/smoke/suppliers-ui.md`. Verify list renders, amounts match backend response.

**Block 2.4 closes with**: `git push origin dev-frontend`.

---

### Block 2.5 — Upload revamp: multi-file, validation table & AI summary

Pre-requisite: Backend Blocks 2.2 and 2.3 complete.

> **Design decision:** every upload now goes through a mandatory human-validation step (backend Block 2.3 enforces this). The upload page is redesigned around that flow: multiple files can be dropped at once, each one is processed sequentially and shown as an editable validation table, and only after the user confirms does the data get saved to the database. There is no "Modo borrador" toggle — the draft stage is always the path.

- [ ] Extend `DropZone` to accept multiple files
  - Change props: `onFiles: (files: File[]) => void` (replace `onFile`). Add `multiple` attribute to the hidden `<input>` and handle multi-file drops in `onDrop`.
  - Client-side validation (PDF mime + `.pdf` extension, ≤ 10 MB) runs per file. Invalid files are rejected inline with per-file error messages; valid ones proceed.
- [ ] Build `FacturaValidationTable` component
  - File: `src/components/FacturaValidationTable.tsx`.
  - Props: `{ draft: FacturaDraft; onConfirm: (id: number, fields: FacturaEditableFields) => Promise<void>; onReject: (id: number) => Promise<void> }`.
  - Renders a two-column table (field label | editable input) for every factura field: `numero`, `fecha`, `emisor`, `receptor`, `concepto`, `base_imponible`, `iva_porcentaje`, `iva_cantidad`, `irpf_porcentaje`, `irpf_cantidad`, `total`, `moneda`, `tipo`.
  - Inputs are pre-filled from the draft. All inputs are editable. `tipo` is a `<select>` with options `ingreso / gasto`. Numeric fields use `type="number"`.
  - "Confirmar" button calls `onConfirm(id, editedFields)`. "Rechazar" button calls `onReject(id)`. Both buttons disable during the async call.
  - Add `FacturaDraft` and `FacturaEditableFields` types to `src/types/index.ts`.
- [ ] Wire the upload queue in `UploadPage`
  - State: `queue: Array<{ file: File; status: 'pending' | 'uploading' | 'review' | 'confirmed' | 'rejected' | 'error'; draft?: FacturaDraft; error?: string }>`.
  - On files received from `DropZone`: add each to the queue as `pending`, then process them **sequentially** (start the next upload only after the previous one reaches `review` or `error`).
  - While uploading a file: set its status to `uploading`, call `api.uploadFactura(file)` (which now returns a draft). On success set status to `review` and store the draft. On error set status to `error` and store the message.
  - Render one `FacturaValidationTable` per file in `review` state, stacked vertically.
  - `onConfirm`: call `api.confirmDraft(id, fields)`. On success set status to `confirmed`. On error show the error inside the table row.
  - `onReject`: call `api.rejectDraft(id)`. On success set status to `rejected`.
- [ ] Show AI summary inside each validation table
  - After a draft reaches `review` status, call `api.getFacturaSummary(draft_id)` in the background.
  - Add `getFacturaSummary(id: number): Promise<{ summary: string }>` to `api.ts`.
  - Display the returned narrative as a muted info block at the top of the `FacturaValidationTable`. Show a spinner while loading; do not block the editable fields.
- [ ] Add "Volver al panel" button
  - Show a `<Link to="/dashboard">` styled as a secondary button at the top of `UploadPage` at all times, and also as a primary CTA once all queued files have reached `confirmed` or `rejected` status.
- [ ] Update `api.ts`
  - `uploadFactura(file)` now returns `{ draft: FacturaDraft }` (backend Block 2.3 changed the response).
  - Add `confirmDraft(id, fields: FacturaEditableFields): Promise<Factura>`.
  - Add `rejectDraft(id): Promise<{ id: number }>`.
  - Add `getDrafts(): Promise<{ drafts: FacturaDraft[] }>`.
  - Add mock paths for all new methods in `public/mock/data.json`.
- [ ] Smoke check
  - File: `scripts/smoke/upload-revamp.md`.
  - Drop 2 PDFs → both appear in queue → first shows validation table after upload → edit one field → confirm → status changes to confirmed → second file uploads → confirm without edits → both confirmed → "Volver al panel" CTA appears. Drop a non-PDF → per-file error shown, valid file proceeds. Reject one → status shows rejected. Navigate to `/dashboard` → both confirmed facturas appear in the table.

**Block 2.5 closes with**: `git push origin dev-frontend`. **End of Phase 2.** Open a PR from `dev-frontend` to `main` summarising the phase.

## Phase 3 — Stretch (high level)

- Alerts UI (client dependency, VAT due dates).
- "Export PDF" button on dashboard (browser print or `html2pdf`).
- Landing page (replaces `/login` as the public entry; login moves to `/login` keeping current behaviour).
