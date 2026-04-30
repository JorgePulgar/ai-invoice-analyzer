# TASKS — Frontend

Work queue for the frontend developer. Follow the per-task and per-block flows from the root `CLAUDE.md`.

All Phase 1 tasks operate against `/mock/data.json` (`USE_MOCK = true` in `src/services/api.ts`) until the corresponding backend endpoint is ready. Block 1.4 flips the flag and validates against the live backend.

Before starting any task, run `npm install` once to pull dependencies.

## Phase 1 — MVP

### Block 1.1 — Authentication UI

- [ ] Implement login form
  - File: `src/pages/LoginPage.tsx`
  - Controlled inputs for email and password (`useState`).
  - On submit, call `useAuth().login(email, password)`. On success, `useNavigate('/dashboard')`. On error, render `err.message` inline.
  - Client-side validation: email format (`type="email"`), password ≥ 8 chars.
- [ ] Implement register form
  - Same file. Toggle between login and register sections via local state (no separate route).
  - On submit, call `useAuth().register(email, password)`.
- [ ] Verify auth-state redirection
  - Visiting `/login` while authed → redirects to `/dashboard` (already wired via `LoginPage`).
  - Visiting `/dashboard` or `/upload` while not authed → redirects to `/login` (already wired via `ProtectedRoute`).
- [ ] Verify logout
  - `Layout` already wires the logout button. Confirm clicking it clears the token and lands on `/login`.
- [ ] Smoke check
  - File: `scripts/smoke/auth.md` (manual checklist) — committed and referenced in the commit body.
  - Steps: register → land on dashboard → logout → land on login → login with same email → land on dashboard.

**Block 1.1 closes with**: `git push origin dev-frontend`.

---

### Block 1.2 — Dashboard

Pre-requisite: Block 1.1 complete. Uses mock data for all endpoints.

- [ ] Create `KpiCard` component
  - File: `src/components/KpiCard.tsx`
  - Props: `{ label: string; value: string }`. Renders a card with label and value using Tailwind.
- [ ] Create `MonthlyChart` component
  - File: `src/components/MonthlyChart.tsx`
  - Props: `{ data: MonthlyEntry[] }`.
  - Use `<Bar>` from `react-chartjs-2` with two datasets (`ingresos`, `gastos`). Register Chart.js components inside this file.
  - Format y-axis ticks as currency via `formatCurrency`.
- [ ] Create `TopClientsList` component
  - File: `src/components/TopClientsList.tsx`
  - Props: `{ clients: ClientEntry[] }`. Renders an ordered list "Cliente — €X (N facturas)".
- [ ] Create `VatTable` component
  - File: `src/components/VatTable.tsx`
  - Props: `{ vat: VatEntry[] }`. Renders a 4-row table with quarter labels (`T1 2026`, etc.).
- [ ] Create `FacturasTable` component
  - File: `src/components/FacturasTable.tsx`
  - Props: `{ facturas: Factura[]; onDelete: (id: number) => void }`.
  - Each row has a delete button calling `onDelete(id)`. Use `formatCurrency` for the total column and `formatDate` for `fecha`.
- [ ] Wire the dashboard page
  - File: `src/pages/DashboardPage.tsx`
  - On mount (`useEffect`), call `Promise.all([api.getSummary(), api.getMonthly(), api.getClients(), api.getVat(), api.listFacturas()])`. Store each in its own `useState`.
  - Render the 5 sections via the components above.
  - Wire `handleDelete = async (id) => { await api.deleteFactura(id); /* re-fetch facturas */ }`.
  - Show a loading state while the initial fetch is pending and an error message if anything throws.
- [ ] Smoke check
  - File: `scripts/smoke/dashboard.md` (manual checklist).
  - Verify: 4 KPIs populated, chart renders with both datasets, top clients listed, VAT table shows 4 rows, facturas table renders mock entries, delete removes a row.

**Block 1.2 closes with**: `git push origin dev-frontend`.

---

### Block 1.3 — Upload page

Pre-requisite: Block 1.1 complete. Block 1.2 is not required.

- [ ] Create `DropZone` component
  - File: `src/components/DropZone.tsx`
  - Props: `{ onFile: (file: File) => void; disabled?: boolean }`.
  - Wire `onDragEnter`, `onDragOver`, `onDragLeave`, `onDrop`. Visual state via Tailwind classes (`border-dashed`, `border-blue-500` on drag-over). Include a "Seleccionar archivo" button that opens a hidden `<input type="file" accept="application/pdf">`.
- [ ] Wire the upload page
  - File: `src/pages/UploadPage.tsx`
  - Render `<DropZone>`, a status area, and a result area (initially hidden).
  - On file: client-side validation (mime `application/pdf` AND `.pdf` extension; size ≤ 10 MB). Reject with inline error.
  - On valid file: set status "Procesando…", `disabled={true}` on DropZone, call `api.uploadFactura(file)`. On success, render the extracted JSON pretty-printed in the result area and update status to "Subido correctamente". On error, show `err.message`. Re-enable DropZone in either case.
- [ ] Smoke check
  - File: `scripts/smoke/upload.md` (manual checklist).
  - Verify: drop a PDF → loading state visible (~800 ms with mock) → JSON renders. Drop a non-PDF → error. Drop a > 10 MB file → error.

**Block 1.3 closes with**: `git push origin dev-frontend`.

---

### Block 1.4 — Backend integration

Pre-requisite: Backend Phase 1 complete (all backend blocks merged into `main` or accessible on `dev-backend`).

- [ ] Flip `USE_MOCK = false` in `src/services/api.ts`
  - One commit dedicated to this flip, with a body stating which backend version is being targeted.
- [ ] End-to-end manual test
  - Start backend (`http://localhost:3000`), run `npm run dev` (frontend at `http://localhost:5173`), walk through register → upload (real PDF) → dashboard.
  - For every step, verify the actual response shape matches `docs/api-contract.md`.
  - If anything diverges, **stop and coordinate with the backend developer.** Do not adapt the frontend silently.
- [ ] CORS sanity check
  - Confirm backend `CORS_ORIGIN` includes `http://localhost:5173`.
  - If a CORS error appears, document it in `docs/LESSONS.md` and resolve it with the backend dev.
- [ ] Run `npm run typecheck` and `npm run build` to confirm production build succeeds.
- [ ] Smoke check
  - File: `scripts/smoke/integration.md` (manual checklist with steps and outcomes captured).

**Block 1.4 closes with**: `git push origin dev-frontend`. **End of Phase 1.** Open a PR from `dev-frontend` to `main` summarising the phase.

---

## Phase 2 — Nice-to-have (high level)

Listed without task-level detail; refined when the phase starts.

- AI summary section on dashboard (consumes new endpoint).
- Manual validation form between extraction and persistence.
- Filters on dashboard (period, client, type) — likely a `<DashboardFilters>` component + URL state.
- Expense vs income visual differentiation (badge/colour) in tables and chart.

## Phase 3 — Stretch (high level)

- Alerts UI (client dependency, VAT due dates).
- "Export PDF" button on dashboard (browser print or `html2pdf`).
- Landing page (replaces `/login` as the public entry; login moves to `/login` keeping current behaviour).
