# CLAUDE.md — Root

Cross-cutting context for Claude Code. Side-specific rules live in `backend/CLAUDE.md` and `frontend/CLAUDE.md`. Each side's `CLAUDE.md` imports `docs/api-contract.md` automatically.

## Reading order at session start

1. This file (auto-loaded).
2. The side-specific `CLAUDE.md` for the directory you started in (auto-loaded).
3. `docs/api-contract.md` — the immutable shape contract (auto-imported by side files).
4. The applicable `TASKS.md` (`backend/TASKS.md` or `frontend/TASKS.md`).
5. `git log --oneline -30` to catch up on recent work.
6. `docs/LESSONS.md` if it exists (created lazily, only when a non-obvious gotcha appears).

## Project one-liner

Invoice Insights — SaaS that extracts data from Spanish invoice PDFs using GPT-4o on Azure AI Foundry (EU region) and shows a financial dashboard. Backend (Node/Express/SQLite) and frontend (React + TypeScript via Vite, with Tailwind) are developed in parallel by two developers.

## Branching and merging

- Branch `dev-backend` for backend work, `dev-frontend` for frontend work.
- Merge to `main` only when a phase is complete.
- Never push directly to `main`.
- Never modify the other side's working tree (do not edit `frontend/` from a backend session and vice versa).

## Per-task flow

For every task in `TASKS.md`:

1. Identify the next unchecked task whose dependencies are met.
2. If scope is ambiguous, **ask before coding**. A short question is better than the wrong implementation.
3. Implement the task fully (no half-implementations, no surrounding refactors).
4. Run any tests that cover the touched code.
5. Mark the task `[x]` in `TASKS.md`.
6. Commit with a Conventional Commits message (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`). The body explains *why* when the change is non-trivial.
7. **Do not push.** Continue to the next task.

## Per-block flow

A "block" is a contiguous group of tasks that complete together (a sub-section of a phase, marked in `TASKS.md` with `**Block X.Y closes with**: push to ...`).

When all tasks in the current block are `[x]`:

1. Verify the working tree is clean (`git status`).
2. Push the side branch to the remote (`git push origin dev-backend` or `git push origin dev-frontend`).
3. If the block was the final block of a phase, open a PR from the side branch to `main` summarising the phase deliverables.

Claude performs the push at block boundaries. Do not push outside this flow.

## Never

- **Do not modify `docs/api-contract.md`** without explicit approval from both developers. The contract is the boundary between sides; changes here break the other side silently.
- **Do not commit secrets.** Verify `.env` is in `.gitignore` before every commit.
- **Do not add dependencies** without justifying why existing ones do not suffice.
- **Do not invent "equivalent tasks"** when blocked by a manual action (Azure portal config, real PDF upload, .env credentials, etc.). Stop, summarise what you need from the human, and wait. Do not mark the original task `[x]` based on a partial substitute.
- **Do not bypass `utils/response.js` (backend) or `services/api.ts` (frontend).** Both are the single source of truth for their layer.
- **Do not skip the language conventions** (see below).

## Always

- **Conventional Commits** with informative bodies for non-trivial changes.
- **One commit per coherent change.** Never batch a whole phase or block into a single commit.
- **Smoke tests require artefacts.** A task that says "verify manually", "smoke test" or similar is only `[x]` when there is reproducible evidence: a saved script under `scripts/smoke/`, a captured `curl` sequence with expected outputs in the commit body, or an automated test under `tests/`. "Verified manually" without evidence is not sufficient.
- **Human-dependent tasks pause, not pivot.** When blocked by a manual step, summarise the blocker and wait. If partial progress is possible without the human action, that partial work is fine to do — but it does NOT close the original task.

## Language

All artefacts in this repository are written in English:

- Code identifiers, comments, log messages, error messages.
- All documentation under `docs/` and the `CLAUDE.md` files themselves.
- `TASKS.md` files.
- Commit messages.

**Intentional Spanish exception — fiscal vocabulary in the data contract.** The JSON contract field names and SQL column names use Spanish fiscal terminology (`numero`, `fecha`, `base_imponible`, `iva_porcentaje`, `iva_cantidad`, `irpf_porcentaje`, `irpf_cantidad`, `tipo: 'ingreso' | 'gasto'`, `emisor`, `receptor`, `concepto`, `moneda`). These map directly to Spanish tax form fields. **Do not translate them.** UI labels shown to end users may also be in Spanish since the product targets Spain.

## Cross-cutting invariants

- **PDFs are deleted immediately after extraction**, on both success and error paths. No PDF is persisted on disk after the upload route returns. This is a GDPR commitment.
- **Standard response envelope** for every API endpoint:
  - Success: `{ "success": true, "data": ... }`
  - Error: `{ "success": false, "error": "human-readable message" }`
- **JWT authentication** for every endpoint except `/api/health` and `/api/auth/*`.
- **Field name conventions** as listed in the language exception above are immutable.
