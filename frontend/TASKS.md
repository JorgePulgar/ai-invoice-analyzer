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

## Phase 3 — Stretch (high level)

- Alerts UI (client dependency, VAT due dates).
- "Export PDF" button on dashboard (browser print or `html2pdf`).
- Landing page (replaces `/login` as the public entry; login moves to `/login` keeping current behaviour).
