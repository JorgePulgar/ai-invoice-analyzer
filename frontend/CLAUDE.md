# CLAUDE.md — Frontend

@../docs/api-contract.md

The contract above is auto-imported. Read the root `CLAUDE.md` first for cross-cutting rules. Read `TASKS.md` in this directory for the work queue.

## Stack

- **React 18** + **TypeScript** (strict mode).
- **Vite 6** as dev server and bundler.
- **Tailwind CSS 3** for styling (utility-first; no plain CSS files outside `index.css`).
- **React Router 6** for navigation (SPA, no multi-page).
- **Chart.js 4** via **react-chartjs-2** wrapper for the monthly-evolution chart.
- **No state-management library.** `useState` + a single `AuthContext`.

## Folder layout

```
frontend/
├── index.html              — Vite entry (mounts <div id="root">)
├── package.json
├── tsconfig.json + tsconfig.app.json + tsconfig.node.json
├── vite.config.ts
├── tailwind.config.js + postcss.config.js
├── public/
│   └── mock/data.json      — served at /mock/data.json
└── src/
    ├── main.tsx            — React root
    ├── App.tsx             — Router + providers
    ├── index.css           — Tailwind directives (no other global CSS)
    ├── vite-env.d.ts
    ├── types/index.ts      — interfaces from the API contract
    ├── services/api.ts     — HTTP layer + USE_MOCK toggle (single source of truth)
    ├── context/
    │   └── AuthContext.tsx
    ├── components/
    │   ├── Layout.tsx      — protected-page chrome (topbar + nav)
    │   ├── ProtectedRoute.tsx
    │   └── …               — KpiCard, MonthlyChart, TopClientsList, VatTable,
    │                          FacturasTable, DropZone (created as needed)
    ├── pages/
    │   ├── LoginPage.tsx
    │   ├── DashboardPage.tsx
    │   └── UploadPage.tsx
    └── utils/
        └── format.ts       — Intl currency/date helpers
```

## Conventions

### HTTP calls

**Never call `fetch` directly from a component.** Always go through `api` exported from `src/services/api.ts`.

If a new endpoint appears in the contract:
1. Add the response type to `src/types/index.ts`.
2. Add a method to `api` covering both the real-backend path and the `USE_MOCK` path.
3. Use the new method from a component or page.

### `USE_MOCK` toggle

`src/services/api.ts` has a single `USE_MOCK` constant at the top. While the backend is not ready, it stays `true` and every method returns mock data from `/mock/data.json` (served by Vite from `public/`). Flip to `false` once the backend is running.

The mock simulates upload latency (~800 ms) so loading states are visible.

### Auth pattern

- JWT stored in `localStorage` under key `ii_token`. `api.ts` is the only place that reads/writes it.
- `AuthContext` exposes `{ isAuthed, login, register, logout }`. Pages and components call `useAuth()` — they do not touch `localStorage` or `api` directly for auth state.
- Protected routes are wrapped in `<ProtectedRoute>`. Public routes (just `/login`) are not.
- After `login` / `register` success, the component using the form redirects (`useNavigate('/dashboard')`).

### Routing

- `/login` — public, redirects to `/dashboard` if already authed.
- `/dashboard` — protected, KPIs + chart + tables.
- `/upload` — protected, drag-and-drop PDF upload.
- `/` redirects to `/dashboard`. Any unknown path redirects to `/login`.

Do not add new top-level routes without a reason. Sub-views (e.g. invoice detail) can be added when justified by `TASKS.md`.

### State

- Local-component state with `useState` is the default.
- Cross-component state goes through Context (currently only `AuthContext`).
- **No Redux, Zustand, Jotai, MobX**, or similar. If a future feature truly needs cross-tree shared state beyond auth, propose it before adding a library.
- **No data-fetching library** (`react-query`, `swr`). For Phase 1, plain `useEffect` + `useState` + `api.*()` is enough. Revisit if cache invalidation becomes painful.

### Components

- **TypeScript strict mode is on.** No `any`. Use `unknown` and narrow if a type is genuinely unclear.
- Named exports for components: `export function MyComponent(...)`. No default exports for components (default exports are reserved for `App.tsx`).
- Props interface defined inline above the component or just above as `interface MyComponentProps { … }`.
- Files use the same name as their export: `KpiCard.tsx` exports `KpiCard`.
- `import type { … }` for type-only imports (verbatimModuleSyntax is on).

### Styling

- **Tailwind utility classes only.** No `<style>` blocks. No inline `style={{ … }}` except for genuinely dynamic values (e.g., chart container size).
- The only global CSS is `src/index.css`, which contains the three Tailwind directives. Do not add custom global styles there.
- For repeated style patterns, extract a component, not a CSS class.
- Use Tailwind's design tokens (`bg-slate-50`, `text-slate-700`, `rounded-lg`, etc.). Avoid arbitrary values (`bg-[#abcdef]`) unless the design genuinely requires them.

### Error display

When a user-facing call fails, render `err.message` in a visible message area (not a toast — keep it inline near the action that failed). The `api` layer already throws an `Error` with the backend's `error` message, so components do not need to inspect status codes.

```tsx
try {
  await login(email, password);
  navigate('/dashboard');
} catch (err) {
  setError(err instanceof Error ? err.message : 'Unknown error');
}
```

### Charts

- One chart in Phase 1: monthly evolution on the dashboard. Use `<Bar>` from `react-chartjs-2` with two datasets (`ingresos`, `gastos`) and `mes` labels.
- Wrap the import + register pattern from `chart.js` in the chart component itself; do not register charts globally.
- Format axis values with `formatCurrency` from `utils/format.ts` (`callbacks: { label: ... }`).

## Commands

```bash
cd frontend
npm install
npm run dev          # vite dev server at http://localhost:5173 (auto-opens)
npm run typecheck    # tsc --noEmit (run before pushing each block)
npm run build        # production build into dist/
npm run preview      # preview the production build locally
```

## When the backend is ready

When a real endpoint goes live:

1. Set `USE_MOCK = false` in `src/services/api.ts` (or per-method during transition).
2. Test against the live backend (`http://localhost:3000`).
3. Verify the response shape matches `docs/api-contract.md`.
4. **If anything diverges, stop and flag it to the backend developer.** Do not silently adapt the frontend to a contract drift. The contract is the boundary.

## When something non-obvious happens

If you discover a CORS quirk, a Vite gotcha, a TypeScript type that fights you for non-trivial reasons, or any browser-specific behaviour that the next session would rediscover — write it to `docs/LESSONS.md` (create it if missing). Keep entries short: what happened, root cause, fix, what to watch for.
