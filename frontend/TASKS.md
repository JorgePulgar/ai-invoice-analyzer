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

## Phase 2 — Complete ✅

All blocks (2.1–2.4) implemented and tested. Ready to merge to main.

### Block 2.1 — Ingreso/Gasto visual differentiation

- [x] Create `TipoBadge` component
  - File: `src/components/TipoBadge.tsx`
  - Props: `{ tipo: Tipo; size?: 'sm' | 'md' }`. Renders pill with ▲/▼ glyph and `bn-up`/`bn-down` colours.
- [x] Tone `KpiCard` by ingreso/gasto
  - Add `tone?: 'up' | 'down' | 'neutral'` prop. Value text coloured accordingly with matching glyph.
- [x] Apply tipo styling across dashboard components
  - `DashboardPage`: pass `tone` to each KPI (ingresos→up, gastos→down, beneficio→dynamic, IVA→neutral).
  - `FacturasTable`: replace text tipo cell with `<TipoBadge>`, colour total cell by tipo, add left rail border by tipo.
  - `TopClientsList`: add ▲ glyph to client facturado amounts (all ingreso).
  - `UploadPage`: show `<TipoBadge>` in the extracted-data result header.

**Block 2.1 closes with**: `git push origin dev-frontend`.

---

### Block 2.2 — Dashboard filters (client-side, URL state)

- [x] Create `src/utils/filters.ts`
  - `FilterState` type, `parseFilters`, `applyFilters`, `deriveSummary`, `deriveMonthly`, `deriveClients`, `deriveVat`.
- [x] Create `DashboardFilters` component
  - File: `src/components/DashboardFilters.tsx`. Periodo / Tipo / Cliente selects wired to `useSearchParams`.
- [x] Wire filters into `DashboardPage`
  - Fetch full facturas on mount; derive analytics client-side when filters are non-default. `facturasOriginal` state feeds cliente dropdown.

**Block 2.2 closes with**: `git push origin dev-frontend`.

---

### Block 2.3 — AI summary section (UI under USE_MOCK)

- [x] Add `AiSummary` type and mock data
  - `src/types/index.ts` + `public/mock/data.json` `aiSummary` field.
- [x] Add `api.getAiSummary()` method
  - Returns mock under `USE_MOCK`; returns `null` under live backend (no throw, no fetch).
- [x] Create `AiSummaryCard` component
  - File: `src/components/AiSummaryCard.tsx`. Loading skeleton, null → hidden, present → narrative card with yellow left border.
- [x] Wire into `DashboardPage` above KPI grid.

**Block 2.3 closes with**: `git push origin dev-frontend`.

---

### Block 2.4 — Manual validation form (UI under USE_MOCK)

- [x] Add `DraftFactura` type and extract/confirm api methods
  - `src/types/index.ts`, `src/services/api.ts`. Fallback to Phase 1 upload under live backend.
- [x] Create `FacturaForm` component
  - File: `src/components/FacturaForm.tsx`. All Factura fields, inline validation, total-mismatch warning chip.
- [x] Wire two-step upload flow into `UploadPage`
  - New status states `extracting | review | saving`. Live-backend fallback to direct upload.

**Block 2.4 closes with**: `git push origin dev-frontend`. **End of Phase 2.** Open a PR from `dev-frontend` to `main` summarising the phase.

---

### Block 2.5 — Automated unit tests for filter math

- [x] Install `vitest` and add `test` / `test:run` scripts to `package.json`.
- [x] Create `tests/utils/filters.test.ts` with 46 test cases covering all 7 exports of `src/utils/filters.ts` (`parseFilters`, `isDefaultFilters`, `applyFilters`, `deriveSummary`, `deriveMonthly`, `deriveClients`, `deriveVat`).

**Block 2.5 closes with**: `git push origin dev-frontend`.

---

## Phase 3 — Dashboard Enhancement

Pre-requisite for all blocks: Phase 2 merged to `main`.

---

### Block 3.1 — KPI expansion + period badge + post-upload navigation

- [x] Add `SupplierEntry` type and `api.getSuppliers()` method
  - File: `src/types/index.ts` — add `SupplierEntry { proveedor: string; gastado: number; num_facturas: number }`.
  - File: `src/services/api.ts` — add `getSuppliers()` calling `GET /api/analytics/suppliers`. Under `USE_MOCK`, return `mockData.suppliers`.
  - File: `public/mock/data.json` — add a `suppliers` array with 3–5 entries.

- [x] Expand KPI row to 7 cards
  - File: `src/pages/DashboardPage.tsx`
  - Add to the `kpis` array: **IRPF Retenido** (`summary.irpf_retenido`, `formatCurrency`, tone `neutral`), **Ticket Medio** (`summary.ticket_medio`, `formatCurrency`, tone `neutral`), **Num. Facturas** (`String(summary.num_facturas)`, tone `neutral`).
  - Update the responsive grid: `grid-cols-2 sm:grid-cols-4 xl:grid-cols-7` or two rows — use good judgement for readability.

- [x] Add period badge above KPI row
  - File: `src/pages/DashboardPage.tsx`
  - Render a small pill between `<DashboardFilters>` and the KPI grid showing `summary.periodo.desde` → `summary.periodo.hasta`, formatted with `formatDate`. Example: "Analizando: ene 2025 → dic 2025".
  - No new component needed; inline Tailwind pill is sufficient.

- [x] Add "Ir al dashboard" link after successful upload
  - File: `src/pages/UploadPage.tsx`
  - When `status === 'success'`, render a `<Link to="/dashboard">` button below the result card. Use `react-router-dom`'s `Link`.

**Block 3.1 closes with**: `git push origin dev-frontend`.

---

### Block 3.2 — Combo chart + KPI trend indicators

Pre-requisite: Block 3.1 complete.

- [x] Upgrade `MonthlyChart` to a combo chart with profit line
  - File: `src/components/MonthlyChart.tsx`
  - Add a third dataset **Beneficio Neto** (derived as `ingresos - gastos` per month), rendered as `type: 'line'` within a `type: 'bar'` chart (Chart.js mixed-chart pattern: set `type: 'line'` on the dataset object).
  - Style: `tension: 0.4`, `pointRadius: 3`, `borderColor` using the existing yellow token (`rgb(250, 204, 21)`). Y-axis shared with the bars.
  - Props interface unchanged: `{ data: MonthlyEntry[] }`. Derive `beneficio` inside the component.

- [x] Add `trend` prop to `KpiCard`
  - File: `src/components/KpiCard.tsx`
  - Add optional `trend?: { pct: number }` prop. When present, render a small subtitle below the value: `↑ +12%` (green) or `↓ -5%` (red). `pct >= 0` → up colour.

- [x] Derive and pass trend to Income and Expense KPI cards
  - File: `src/pages/DashboardPage.tsx`
  - Add a pure helper `calcTrend(monthly: MonthlyEntry[], key: 'ingresos' | 'gastos'): number | null` in the same file: compare the sum of the last 3 monthly entries vs the 3 before that; return `null` if fewer than 6 entries.
  - Pass `trend` to the Income and Expenses KPI cards.

**Block 3.2 closes with**: `git push origin dev-frontend`.

---

### Block 3.3 — New sections: suppliers, revenue distribution, expense categories

Pre-requisite: Block 3.1 complete.

- [x] Create `TopSuppliersList` component
  - File: `src/components/TopSuppliersList.tsx`
  - Props: `{ suppliers: SupplierEntry[] }`. Mirrors `TopClientsList` in structure and styling. Each row: supplier name — €X (N facturas). Header: "Top Proveedores".

- [x] Create `RevenueChart` component (doughnut)
  - File: `src/components/RevenueChart.tsx`
  - Props: `{ clients: ClientEntry[] }`. Renders a `<Doughnut>` from `react-chartjs-2`. Register `ArcElement`, `Tooltip`, `Legend` inside this file.
  - Each segment is one client's `facturado`. Tooltip: `{cliente}: {formatCurrency(facturado)}`. Title: "Ingresos por cliente". If `clients` is empty, render a placeholder message.

- [x] Create `ExpenseCategoriesChart` component (doughnut)
  - File: `src/components/ExpenseCategoriesChart.tsx`
  - Props: `{ facturas: Factura[] }`. Filters `tipo === 'gasto'`. Categorises by `concepto` via keyword matching (case-insensitive):
    - Software: adobe, notion, github, figma, slack, zoom, hosting, dominio, suscripci
    - Transporte: taxi, uber, renfe, vuelo, gasolina, parking, transporte
    - Marketing: publicidad, ads, marketing, diseño, contenido
    - Equipamiento: ordenador, portátil, monitor, impresora, hardware
    - Oficina: material, papelería, alquiler, suministros, electricidad, internet
    - Gestoría: gestor, asesor, contabilidad, notario, impuesto, tributo
    - Otros: catch-all
  - Aggregates total spend per category, renders as `<Doughnut>`. Title: "Categorías de gasto". If no expenses, render a placeholder.

- [x] Wire into `DashboardPage`
  - Add `api.getSuppliers()` to the initial `Promise.all`. Store in `serverSuppliers` state; apply `deriveSuppliers` (simple filter on facturas) when filters are active (you will need to add `deriveSuppliers` to `src/utils/filters.ts`).
  - Layout change: replace the current `[TopClientsList | VatTable]` row with two rows:
    - Row A (2-col): `<TopClientsList>` | `<TopSuppliersList>`
    - Row B (2-col): `<RevenueChart>` | `<ExpenseCategoriesChart>`
  - Move `<VatTable>` to Block 3.4.

**Block 3.3 closes with**: `git push origin dev-frontend`.

---

### Block 3.4 — Tax section upgrade + cash flow + profit margin charts

Pre-requisite: Block 3.1 complete.

- [x] Create `VatChart` component (grouped bar chart)
  - File: `src/components/VatChart.tsx`
  - Props: `{ vat: VatEntry[] }`. Renders a `<Bar>` with 3 grouped datasets: **IVA Repercutido**, **IVA Soportado**, **IVA a Pagar**. X-axis labels: `T1 2026`, etc. Do NOT use stacking (values would double-count).
  - Title: "IVA Trimestral".

- [x] Create `IrpfWidget` component
  - File: `src/components/IrpfWidget.tsx`
  - Props: `{ amount: number }`. Card with label "IRPF retenido por clientes", formatted amount, and a one-line sub-text "Tus clientes ya lo han ingresado a Hacienda en tu nombre". Yellow left-border accent. No chart needed.

- [x] Create `CashFlowChart` component (area line)
  - File: `src/components/CashFlowChart.tsx`
  - Props: `{ data: MonthlyEntry[] }`. Derives `cashFlow[i] = ingresos[i] - gastos[i]` per month. Renders `<Line>` with `fill: true`. Positive fill: `rgba(74,222,128,0.2)`, negative: `rgba(248,113,113,0.2)` — use a `segment` colouring callback or a single neutral fill if Chart.js segment colouring proves complex.
  - Title: "Flujo de caja mensual".

- [x] Create `ProfitMarginChart` component (line)
  - File: `src/components/ProfitMarginChart.tsx`
  - Props: `{ data: MonthlyEntry[] }`. Derives `margin[i] = ingresos[i] > 0 ? ((ingresos[i] - gastos[i]) / ingresos[i]) * 100 : null`. Renders `<Line>`. Y-axis format: append `%`. Null gaps render as gaps in the line (Chart.js default).
  - Title: "Margen de beneficio mensual (%)".

- [x] Wire into `DashboardPage`
  - Add a VAT row: `<VatChart>` (left, 2/3 width) + `<IrpfWidget>` (right, 1/3 width) above `<VatTable>` (keep table — chart is the visual summary, table has exact numbers).
  - Add a 2-col row below the VAT section: `<CashFlowChart>` | `<ProfitMarginChart>`.

**Block 3.4 closes with**: `git push origin dev-frontend`.

---

### Block 3.5 — Rule-based AI Insights panel

Pre-requisite: Blocks 3.2 and 3.3 complete.

> All insights are derived from data already in memory. Do NOT call any AI API for this feature.

- [x] Create `src/utils/insights.ts`
  - Export `deriveInsights(summary: Summary, monthly: MonthlyEntry[], clients: ClientEntry[], suppliers: SupplierEntry[]): string[]`.
  - Return up to 5 non-empty insight strings. Rules:
    1. **Revenue trend** — compare last month `ingresos` vs month before; emit if `|pct| >= 5`. Example: "Tus ingresos subieron un 12% este mes."
    2. **Expense trend** — same for `gastos`. Example: "Tus gastos bajaron un 8% este mes."
    3. **Client concentration** — `(clients[0].facturado / summary.ingresos_totales) * 100`; emit if `> 35`. Example: "El cliente principal representa el 41% de tus ingresos."
    4. **VAT alert** — emit if `summary.iva_a_pagar > 0`. Example: "Tienes €X de IVA pendiente de declarar."
    5. **IRPF notice** — emit if `summary.irpf_retenido > 0`. Example: "Tus clientes ya han retenido €X de IRPF en tu nombre."
  - Return `[]` when data is empty or thresholds are not met.

- [x] Create `InsightsPanel` component
  - File: `src/components/InsightsPanel.tsx`
  - Props: `{ insights: string[] }`. Return `null` when array is empty.
  - Card with header "Análisis automático", yellow left-border accent, and a styled `<ul>` where each item has a `→` glyph.

- [x] Add unit tests for `insights.ts`
  - File: `tests/utils/insights.test.ts`
  - Cover: empty data → empty array; concentration above and below threshold; VAT alert on/off; revenue change sign.

- [x] Wire into `DashboardPage`
  - Derive `insights` inline (pure call, no effect): `const insights = deriveInsights(summary, monthly, clients, suppliers)`.
  - Render `<InsightsPanel>` above `<FacturasTable>`, below the cash-flow section.

**Block 3.5 closes with**: `git push origin dev-frontend`.

---

### Block 3.6 — Filter presets + forecast line + calendar heatmap (stretch)

Pre-requisite: Block 3.2 complete.

- [x] Add quick-filter preset buttons to `DashboardFilters`
  - File: `src/components/DashboardFilters.tsx`
  - Add a row of 4 pill buttons: "Últimos 30 días", "Últimos 3 meses", "Este año", "Año anterior".
  - Each button calls `setSearchParams` with the corresponding `desde` / `hasta` derived from `new Date()`. "Este año": Jan 1 → Dec 31 of current year. "Año anterior": same range one year back.
  - Active preset is highlighted (compare current params to the derived values).

- [x] Add forecast option to `MonthlyChart`
  - File: `src/components/MonthlyChart.tsx`
  - Add optional `forecast?: boolean` prop (default `false`). When `true`, append 3 synthetic months after the last real data point: each predicted value is the average of the last 3 real months for both `ingresos` and `gastos`.
  - Render forecast months as a separate dashed dataset (`borderDash: [6, 4]`). Label synthetic months with a `*` suffix.
  - In `DashboardPage`, enable `forecast` only when no date filters are active.

- [x] Add invoice activity calendar heatmap
  - Install: `npm install react-calendar-heatmap` (justification: no existing chart renders a calendar-grid layout; Chart.js has no calendar axis).
  - File: `src/components/InvoiceHeatmap.tsx`
  - Props: `{ facturas: Factura[] }`. Groups facturas by `fecha`, counts per day. Renders `CalendarHeatmap` for the current calendar year. Tooltip: "N facturas — DD MMM YYYY".
  - Title: "Actividad de facturación".
  - Wire into `DashboardPage` below `<InsightsPanel>`, full width.

**Block 3.6 closes with**: `git push origin dev-frontend`. **End of Phase 3.**

---

## Phase 4 — Polish & Production Readiness

Pre-requisite for all blocks: Phase 3 merged to `main`.

---

### Block 4.0 — Bug fixes & Spanish UI

- [x] Fix dashboard filter reload bug
  - File: `src/pages/DashboardPage.tsx`
  - When a filter changes via `DashboardFilters`, the page does not re-derive or re-render dashboard data.
  - Diagnose: inspect the `useSearchParams` → `useEffect` dependency array. The effect that drives `applyFilters` / `deriveSummary` / `deriveMonthly` etc. must list the `FilterState` values (or the serialised search-params string) as dependencies so it re-runs on every filter change.
  - Expected behaviour: changing any filter (periodo, tipo, cliente) immediately updates KPIs, charts, and tables without a full page refresh or manual reload.

- [x] Fix card layout and visual distribution
  - Files: `src/pages/DashboardPage.tsx`, affected chart and card components.
  - Audit the KPI grid (7 cards), chart rows, and the two-column sections for broken spacing, overflow, or misaligned cards at common viewport widths (1280 px, 1440 px, and mobile 375 px).
  - Fix each issue in a separate commit; describe the specific symptom fixed in the commit body.
  - Pay special attention to: KPI grid wrapping at mid-widths, chart containers with hard-coded heights, `TopSuppliersList` / `TopClientsList` row alignment.

- [x] Translate all UI text to Spanish
  - Scope: every user-visible string — headings, labels, placeholder text, button text, error messages, empty-state messages, loading indicators, tooltip content.
  - Files: all `src/pages/*.tsx` and `src/components/*.tsx`.
  - Do NOT translate: code identifiers, console/log messages, `docs/` content. Field names (`numero`, `fecha`, etc.) are already Spanish — leave them.
  - Commit per logical group (e.g., one commit for `DashboardPage` + KPI labels, one for upload flow, one for auth forms).

**Block 4.0 closes with**: `git push origin dev-frontend`.

---

### Block 4.1 — Demo seed data

Pre-requisite: backend seed script ready (see `backend/TASKS.md` Block 4.1).

> The seed script itself lives in `backend/` and is tracked in `backend/TASKS.md`. This block covers the frontend verification step only.

- [ ] Verify demo dashboard renders well with seed data
  - Log in as the demo account (`demo@invoice-insights.com` / `demo1234` — credentials set by the backend seed script).
  - Walk through every dashboard section:
    - KPI row: all 7 cards populated with non-zero values.
    - MonthlyChart: combo bar+line renders across ≥ 6 months with visible profit line.
    - TopClientsList and TopSuppliersList: at least 3 entries each.
    - RevenueChart and ExpenseCategoriesChart doughnuts: multiple segments, no "sin datos" placeholder.
    - VatChart: at least 2 quarters with non-zero bars.
    - IrpfWidget: non-zero amount.
    - CashFlowChart and ProfitMarginChart: smooth curves across ≥ 6 months.
    - InsightsPanel: at least 2 insights fired.
    - InvoiceHeatmap: activity visible across multiple months.
  - File: `scripts/smoke/demo-seed.md` — manual checklist with pass/fail per section, committed.

**Block 4.1 closes with**: `git push origin dev-frontend`.

---

### Block 4.2 — Landing page

- [x] Create `LandingPage` component
  - File: `src/pages/LandingPage.tsx`
  - Public route (no `<ProtectedRoute>`). If already authenticated, redirect to `/dashboard`.
  - Sections (all text in Spanish):
    1. Hero — product name "Invoice Insights", one-line pitch, two CTAs: "Empezar gratis" → `/login` (register tab) and "Ver demo" → `/dashboard` (links to demo account or just dashboard).
    2. Features — 4 cards: extracción PDF con IA, dashboard financiero, resumen fiscal (IVA / IRPF), insights automáticos.
    3. Footer — minimal: copyright, link to `/login`.
  - Styling: full-width Tailwind layout consistent with the existing palette (`slate`, yellow accent).

- [x] Update routing in `App.tsx`
  - `/` → `<LandingPage>` (public, no auth guard).
  - Keep `/login` as the auth page.
  - Unauthenticated unknown paths → redirect to `/` instead of `/login`.

**Block 4.2 closes with**: `git push origin dev-frontend`.

---

### Block 4.3 — Alerts banner

- [x] Create `AlertsBanner` component
  - File: `src/components/AlertsBanner.tsx`
  - Props: `{ summary: Summary; vat: VatEntry[] }`. All logic is client-side — no new endpoint.
  - Derives up to 3 alert types:
    1. **Concentración de cliente** — emit if `(clients[0].facturado / summary.ingresos_totales) > 0.5`. Message: "Tu cliente principal representa más del 50 % de tus ingresos. Considera diversificar."
    2. **IVA próximo a vencer** — emit if today is within 15 days before the end of a quarter (Mar 31, Jun 30, Sep 30, Dec 31) and `iva_a_pagar > 0` for that quarter. Message: "El plazo de declaración del IVA del TN vence en X días. IVA a pagar: €Y."
    3. **IRPF anual** — emit in December if `summary.irpf_retenido > 0`. Message: "Tus clientes han retenido €X de IRPF este año."
  - Each alert is a dismissible pill; dismissed state stored in `localStorage` under key `ii_dismissed_<alertKey>`.
  - Render at the top of `DashboardPage`, above `<DashboardFilters>`.

**Block 4.3 closes with**: `git push origin dev-frontend`.

---

### Block 4.4 — Export / print

- [x] Add "Exportar PDF" button to dashboard header
  - Use `window.print()` with a `@media print` stylesheet in `src/index.css`:
    - Hide nav, filters bar, action buttons, and `AlertsBanner` in print view.
    - Expand chart containers to full width in print.
  - If `window.print()` produces unacceptable layout (charts clipped, colours lost), document the specific failure in `docs/LESSONS.md` and propose a library (`html2canvas` + `jsPDF`) before adding it.
  - Button text: "Exportar PDF". Place in `DashboardPage` header row alongside the period badge.

**Block 4.4 closes with**: `git push origin dev-frontend`.

---

### Block 4.5 — Dark theme & visual polish

- [ ] Implement dark mode toggle
  - Use Tailwind's `dark:` variant (`darkMode: 'class'` in `tailwind.config.js`).
  - Toggle adds/removes the `dark` class on `<html>`. Preference stored in `localStorage` under `ii_theme`.
  - Wire toggle button (sun/moon icon or text) in `Layout.tsx` top bar.
  - Apply `dark:` variants to all background, text, border, and chart colours across `DashboardPage`, `UploadPage`, and all components.
- [ ] Visual polish pass
  - Card hover: `shadow-md` → `shadow-lg` transition on chart cards.
  - KPI cards: subtle gradient top border using the yellow accent colour.
  - Consistent `gap-6` spacing between all dashboard rows.

**Block 4.5 closes with**: `git push origin dev-frontend`. **End of Phase 4.** Open a PR from `dev-frontend` to `main` summarising the phase.
