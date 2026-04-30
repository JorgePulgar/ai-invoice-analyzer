# Invoice Insights

Financial-analysis SaaS for Spanish freelancers and SMBs. Users upload invoice PDFs; the app extracts data with GPT-4o (Azure AI Foundry, EU region) and shows a dashboard with KPIs, monthly evolution, top clients, and quarterly VAT breakdown.

> **Status: in active development.** This is a placeholder README for the build phase. The authoritative working documents are `CLAUDE.md` (rules for Claude Code), `docs/api-contract.md` (endpoint shapes), and the per-side `TASKS.md` files.

## How we are building this, and why

Two developers, two parallel tracks:

- **Backend** (Node/Express + SQLite + Azure AI Foundry) on branch `dev-backend`.
- **Frontend** (React + TypeScript via Vite, with Tailwind) on branch `dev-frontend`.

The two tracks meet at one fixed contract: `docs/api-contract.md`. The frontend is built mock-first against `frontend/public/mock/data.json`, which mirrors the real API responses. The consequence:

- The backend can be missing or broken — the frontend keeps working from the mock.
- The frontend can be missing — the backend has its own smoke scripts.
- The only coupling between sides is the contract. As long as both sides honour it, neither blocks the other.

We merge to `main` only when a phase is complete. Phase plan:

- **Phase 1 — MVP.** Auth, upload + extraction (with mandatory immediate PDF deletion for GDPR), analytics endpoints, dashboard, drag-and-drop upload.
- **Phase 2 — Nice-to-have.** AI summary per upload, manual validation step before persisting, dashboard filters, expense-flow improvements.
- **Phase 3 — Stretch.** Alerts, PDF export of the dashboard, landing page.

Both developers use Claude Code; per-side conventions live in `backend/CLAUDE.md` and `frontend/CLAUDE.md`, and cross-cutting rules live in the root `CLAUDE.md`. Each side has its own `TASKS.md` with the phase work queue.

## Stack

- **Backend:** Node.js ≥ 20, Express, `better-sqlite3` (no ORM), `bcrypt`, `jsonwebtoken`, `multer`.
- **Frontend:** React 18 + TypeScript (strict) on Vite 6, Tailwind CSS 3 for styling, React Router 6 for navigation, Chart.js 4 via `react-chartjs-2`. No state-management library — `useState` + a single `AuthContext`.
- **AI:** GPT-4o on Azure AI Foundry (EU region, GDPR-compliant).
- **Storage:** SQLite. Uploaded PDFs are deleted immediately after extraction; nothing personal is persisted on disk.

## Quick start

### Backend

```bash
cd backend
cp .env.example .env       # fill JWT_SECRET and Azure credentials
npm install
npm run init-db            # apply schema, creates ./data/invoice-insights.db
npm run dev                # nodemon on http://localhost:3000
```

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend

```bash
cd frontend
npm install
npm run dev                # Vite at http://localhost:5173 (auto-opens)
```

By default `src/services/api.ts` runs with `USE_MOCK = true` and reads `/mock/data.json` (served by Vite from `public/`). Flip to `false` once the backend is running.

## Project structure (current)

```
ai-invoice-analyzer/
├── CLAUDE.md                ← cross-cutting rules for Claude Code
├── docs/
│   └── api-contract.md      ← immutable shape contract (boundary between sides)
├── backend/
│   ├── CLAUDE.md            ← backend conventions (raw SQL, response helpers, Azure)
│   ├── TASKS.md             ← phase tasks for backend
│   ├── src/                 ← Express app (routes, services, middleware, db, utils)
│   ├── uploads/             ← temporary; PDFs deleted immediately after extraction
│   └── .env.example
└── frontend/
    ├── CLAUDE.md            ← frontend conventions (React, TS, Tailwind, api service)
    ├── TASKS.md             ← phase tasks for frontend
    ├── package.json + vite.config.ts + tsconfig.* + tailwind.config.js
    ├── index.html           ← Vite entry
    ├── public/mock/data.json ← realistic mock responses for every endpoint
    └── src/                 ← App, pages, components, context, services, types
```

## Language

All documentation, code identifiers, comments, and commit messages are in English. The data contract uses Spanish fiscal vocabulary (`numero`, `fecha`, `base_imponible`, `iva_*`, `irpf_*`, `tipo`, etc.) because those map directly to Spanish tax forms — do not anglicise them. UI labels shown to end users are also in Spanish; the product targets Spain.
