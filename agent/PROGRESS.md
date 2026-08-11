# Progress

Append-only handoff log. Newest entries at the bottom. One entry per continuation run, written by the executor before it hands back to the wrapper.

Each entry records: the worktree and branch, the task and the plan it came from, what changed and why, the commands run and their results, and anything a human needs to look at. Never record secrets, connection strings, or tokens here.

---

## Bootstrap (harness-state)

- Written by hand during the harness bootstrap, not by a continuation run.
- Seeded `agent/vision.md`, `agent/categories.json`, `agent/feature_list.json`, `agent/harness-config.json`, `agent/harness/horizon.json`, and `agent/init.sh`.
- The feature list opens with the nine harness bootstrap phases so the planner has real dependency structure and history to reason over from its first run. The product roadmap is seeded later by `product-backlog-seed`.
- Verification: `npm run eval` covers the feature list invariants (unique ids and priorities, resolving dependencies, an acyclic graph, and no completed task depending on unfinished work).
- Next: `harness-prompts`.

## Bootstrap (supply-chain-hardening): canary results

Per `.agents/rules/evals.md`, a validator nobody has seen fail is not a validator. Every gate was broken deliberately and observed to fail, then restored. 8 of 8 behaved:

| Gate | Injected fault | Exit |
| --- | --- | --- |
| baseline | none | 0 |
| `npm run lint` | explicit `any` | 1 |
| `npm run typecheck` | `const x: number = "string"` | 2 |
| `npm run eval` | off-by-one in batch year slicing | 1 |
| `npm run eval` (state) | dependency cycle in `feature_list.json` | 1 |
| `npm run eval` (contract) | renamed `secret_scan_clean` in the validator prompt | 1 |
| `shellcheck` | unterminated function in `guards.sh` | 1 |
| restored | none | 0 |

The `guards.sh` checks were proven separately against a throwaway repository: `.env` added, connection string added, private key added, lone lockfile change, and a 63-file diff against a cap of 40 were each blocked; a clean diff and a lockfile change accompanied by its manifest each passed. That exercise found a real bug: the private-key pattern began with `-`, so `grep` parsed it as a flag and the pattern had never matched anything.

No canary code was merged.

## continue-20260811-160356 (company-detail-route)

- **Worktree / branch:** `.harness/worktrees/continue-20260811-160356` / `harness/continue-local-20260811-160356`
- **Task / plan:** `company-detail-route` / `plan-20260811103501`
- **What changed:** Added Server Component route `src/app/companies/[id]/page.tsx` and presentational `src/components/company-detail.tsx`. Cards already linked here; the route was missing. Profile renders name, description (long_description / one_liner), website (http(s) only as link), batch via `formatBatch`, team size, location, tags, industries, status, and last synced. Missing company uses `notFound()`; other `getCompanyById` failures show a generic safe message (no driver text). Page metadata uses company name and one-liner.
- **Why:** Restores the primary navigation path (24 cards per page were 404s) and surfaces freshness for evidence-backed intelligence.
- **Commands:**
  - `npm ci` (worktree had no `node_modules`; required for build)
  - `npm run verify` → exit 0 (lint, typecheck, 74 evals, build). Route table includes `ƒ /companies/[id]`. Build succeeded without relying on DATABASE_URL for compile.
- **Human notes:** No new dependencies. Did not add `loading.tsx` / `error.tsx` (owned by `route-loading-and-error-states`). Did not change SQL or `companies.ts`. No hermetic eval under `src/eval/**` (plan constrained allowed paths away from evals). Horizon slice advanced past this completed feature.

## continue-20260811-173859 (app-metadata-and-db-exports)

- **Worktree / branch:** `.harness/worktrees/continue-20260811-173859` / `harness/continue-local-20260811-173859`
- **Task / plan:** `app-metadata-and-db-exports` / `plan-20260811121025`
- **What changed:** Root layout metadata now uses product title "Deep Research Agents" and a real product description (no Create Next App placeholders). `src/db/index.ts` re-exports `getCompaniesWithOffset` with the other company queries. Listing page imports `getCompaniesWithOffset` and `getCompanyCount` from `@/db`.
- **Why:** User-facing root metadata was still the scaffold; the db barrel omitted a query the page already uses, so the public surface was incomplete and misleading.
- **Commands:**
  - `npm ci` (worktree had no `node_modules`)
  - `npm run verify` → exit 0 (lint, typecheck, 74 evals, build). Build succeeded without DATABASE_URL.
- **Human notes:** No new dependencies. No SQL, schema, embeddings, or route loading/error files. No hermetic eval under `src/eval/**` (static metadata + re-export only; plan path caps). Horizon slice advanced past this completed feature.
