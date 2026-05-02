# Smoke check — Phase 2 Dashboard (Blocks 2.1, 2.2, 2.3)

Environment: dev server at http://localhost:5173. Run with `cd frontend && npm run dev`.
Two configurations to exercise:

- **A** — Live backend: `USE_MOCK = false` in `src/services/api.ts` (current default). Backend running at `http://localhost:3000`.
- **B** — Mock mode: temporarily flip `USE_MOCK = true` for the items that depend on it (only the AI summary card needs this). Revert before pushing.

## Pre-condition

Log in (or register) to reach `/dashboard`.

---

## Block 2.1 — Income/Expense visual differentiation

### KPI tones (Configuration A or B)

1. Navigate to `/dashboard`.
   - Expected: 4 KPI cards visible.
   - **Total Income** — value text in green (`bn-up`), prefixed with ▲ glyph.
   - **Total Expenses** — value text in red (`bn-down`), prefixed with ▼ glyph.
   - **Net Profit** — green ▲ when positive (mock data is positive), red ▼ when negative.
   - **VAT Due** — neutral yellow (`bn-yellow`), no glyph.

### TipoBadge pills + total cell colour + row rail (Invoices table)

2. Scroll to the **Invoices** table.
   - Each row's *Type* cell shows a coloured pill: green "▲ Income" or red "▼ Expense".
   - Total cell text colour matches: green for Income rows, red for Expense rows.
   - Each row has a thin coloured left rail (border-l-2): green for Income, red for Expense.
   - Row hover still shows the elevated background (`bn-elevated`).

### TopClientsList glyph

3. Inspect **Top Clients** panel (right column).
   - Each client's invoiced amount is prefixed with a small green ▲ glyph (clients are income-only).

### Upload page result panel (light check)

4. Navigate to `/upload`.
   - The result panel header (when a result is present from a prior upload) renders a `TipoBadge` next to "Datos extraídos".
   - On a fresh page (no result yet), no badge — only the DropZone + helper text.

---

## Block 2.2 — Client-side dashboard filters with URL state

Configuration: A or B (filters work identically in both since they operate on already-fetched data).

### Filter bar visibility

5. On `/dashboard`, the filter bar is rendered between the AI summary card and the KPI grid.
   - Three selects: **Period**, **Type**, **Client**.
   - "Clear filters" link is hidden when no filters are active.

### Period filter

6. Choose **This month**.
   - Expected URL becomes `/dashboard?periodo=mes`.
   - KPIs and tables recompute to only count invoices dated in the current month (live backend: depends on real data; mock: April 2026 → only April invoices, IDs 1, 2 + expense ID 3).
   - Monthly chart still shows 12 buckets, but only the current-month bucket has values.

### Type filter

7. Choose **Type → Expenses**.
   - Expected URL: `?tipo=gasto` (or composed with previous, e.g. `?periodo=mes&tipo=gasto`).
   - Invoices table only shows expense rows.
   - Income KPIs zero out, Expense KPI matches the displayed rows.
   - **Client** select becomes disabled (gray + "not allowed" cursor).

### Client filter (Income only)

8. Reset Type to **All** (or select **Income**).
9. Choose **Client → Telefónica Movistar SA** (or any income receptor present in your data).
   - Expected URL: `?cliente=Telefónica%20Movistar%20SA`.
   - Invoices table filters to that client.
   - Top Clients panel reduces to that single entry.

### Clear filters

10. Click **Clear filters**.
    - URL becomes `/dashboard` (no query string).
    - All controls return to defaults.
    - Data matches an unfiltered server response (compare to step 1 KPI values).

### URL persistence

11. Apply a filter combination (e.g. `?periodo=mes&tipo=ingreso`).
12. Hard-refresh the page (Ctrl+F5).
    - Expected: filters and filtered data restore from the URL.

### Cliente auto-clear on Type → Expenses

13. From a state with `?cliente=X&tipo=ingreso`, change Type to **Expenses**.
    - Expected: URL drops `cliente` (`?tipo=gasto`), Client select shows "All clients" + disabled.

### Empty filter state

14. Apply a filter combination that yields zero invoices (e.g. `?periodo=mes&cliente=Mapfre%20SA` if Mapfre has no current-month invoices).
    - Expected: empty-state card "No invoices match the selected filters."
    - KPIs all show zero.
    - Monthly chart, Top Clients, VAT Table are hidden under the empty-state card.

### Delete while filtered

15. With a filter active, click **Delete** on an invoice row.
    - Confirm in the browser dialog.
    - That row disappears from the filtered view; the dropdown's client list still includes the original receptor (re-fetch keeps `facturasOriginal` consistent).

---

## Block 2.3 — AI Summary card

Configuration: **B (mock mode)** for the visible card; **A (live backend)** for the silent no-op.

### Mock path

16. Set `USE_MOCK = true` in `src/services/api.ts`. Restart the dev server.
17. Navigate to `/dashboard`.
    - Expected: at the very top of the dashboard a yellow-accented card appears with:
      - Heading "✨ Period Summary".
      - Subtitle "Generated on dd/mm/yyyy".
      - Body paragraph in English describing income / expenses / VAT exposure.
    - No network errors in the console.

### Live-backend no-op

18. Revert to `USE_MOCK = false`. Restart.
19. Reload `/dashboard`.
    - Expected: AI summary card NOT rendered. No 404s for `/api/analytics/ai-summary` in the network tab.
    - DevTools network tab confirms `getAiSummary` short-circuits without making a call.

---

## Result

All steps passed on: <!-- fill in date and commit sha -->
