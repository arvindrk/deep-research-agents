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

## continue-20260811-175138 (drop-unused-embedding-select)

- **Worktree / branch:** `.harness/worktrees/continue-20260811-175138` / `harness/continue-local-20260811-175138`
- **Task / plan:** `drop-unused-embedding-select` / `plan-20260811122236`
- **What changed:** Removed `embedding` from the SELECT lists of `getCompanyById` and both cursor branches of `getAllCompanies` in `src/db/queries/companies.ts`. Made `Company.embedding` optional in `src/db/types.ts` so omitted selects match the type. Left `searchCompanies` embedding column, hybrid weights (0.7 / 0.2 / 0.1), and `HNSW_EF_SEARCH` unchanged. Advanced horizon past this completed feature.
- **Why:** List and detail callers never read the vector; selecting it ships large unused payloads and will get worse once embeddings are populated.
- **Commands:**
  - `npm ci` (worktree had no `node_modules`)
  - `npm run verify` → exit 0 (lint, typecheck, 74 evals, build). Build succeeded without DATABASE_URL.
- **Human notes:** No new dependencies. No app/component/schema changes. No hermetic eval under `src/eval/**` (plan allowed only query/types paths; behaviour is column-list omission, not ranking). Parameterized SQL only. Horizon next: route-loading-and-error-states.

## continue-20260811-181159 (route-loading-and-error-states)

- **Worktree / branch:** `.harness/worktrees/continue-20260811-181159` / `harness/continue-local-20260811-181159`
- **Task / plan:** `route-loading-and-error-states` / `plan-20260811124342`
- **What changed:** Added App Router `loading.tsx` and client `error.tsx` for the listing segment (`src/app/`) and the detail segment (`src/app/companies/[id]/`). Listing page Result failure paths no longer interpolate `countResult.error` / `companiesResult.error`; they show generic actionable copy. Detail keeps `notFound()` for missing companies and its existing safe inline error for other failures. Loading UIs are presentational skeletons using design tokens only (no db or env).
- **Why:** Failed DB work must not blank the page or leak driver text; slow server awaits need a real loading surface for UI reliability before the embedding arc.
- **Commands:**
  - `npm ci` (worktree had no `node_modules`)
  - `npm run verify` → exit 0 (lint, typecheck, 74 evals, build). Route table still includes `ƒ /` and `ƒ /companies/[id]`. Build succeeded without DATABASE_URL.
- **Human notes:** No new dependencies. No `src/db/**`, eval, hybrid weights, or package.json changes. No hermetic eval under `src/eval/**` (plan forbade that path; boundaries are presentational + copy). Horizon advanced past this completed feature.

## continue-20260811-214332 (embedding-generation-pipeline)

- **Worktree / branch:** `.harness/worktrees/continue-20260811-214332` / `harness/continue-local-20260811-214332`
- **Task / plan:** `embedding-generation-pipeline` / `plan-20260811161522`
- **What changed:** Added pure helpers in `src/lib/company-embedding.ts` (1536-d constant, text composition, dimension assert, batch count). Added `embedText` via OpenAI embeddings HTTP `fetch` (no SDK) and `refreshCompanyEmbedding` for new/updated rows. DB: `listCompaniesMissingEmbeddings` (id + text only, `embedding IS NULL`) and `updateCompanyEmbedding` (JSON + `::vector`, dimension assert before write). Dry-runable `scripts/backfill-embeddings.ts` (not in verify/build). Hermetic evals in `src/eval/company-embedding.eval.ts`. Unblocked hybrid search by producing store path for vectors. Horizon advanced past this feature.
- **Why:** `searchCompanies` expects vectors; schema had the column; nothing generated embeddings, so semantic search was unreachable.
- **Commands:**
  - `npm ci` (worktree had no `node_modules`)
  - Eval canary: set `EMBEDDING_DIMENSIONS` to 999 → company-embedding eval exit 1 (3 fails); restored → exit 0 (10 pass)
  - `npm run verify` → exit 0 (lint, typecheck, 84 evals, build). Build succeeded without DATABASE_URL or OPENAI_API_KEY.
- **Human notes:** No new dependencies. Did not add search route, search UI, or change hybrid weights (0.7/0.2/0.1) or `HNSW_EF_SEARCH`. Backfill not executed against a live DB in this run (no secrets in worktree). Operator can run `npx tsx scripts/backfill-embeddings.ts --dry-run` then without `--dry-run` when keys are set. EXPLAIN ANALYZE not run live (no DATABASE_URL); intended plans: list uses `WHERE embedding IS NULL ORDER BY id LIMIT` (bounded); update is single-row by primary key.

## continue-20260812-161258 (hybrid-search-api)

- **Worktree / branch:** `.harness/worktrees/continue-20260812-161258` / `harness/continue-local-20260812-161258`
- **Task / plan:** `hybrid-search-api` / `plan-20260812104450`
- **What changed:** Named `HYBRID_SEARCH_WEIGHTS` (semantic 0.7 / nameTrigram 0.2 / fullText 0.1) and used those scalars as parameterized weights in `searchCompanies`; omitted `embedding` from the SELECT (score still uses the column). Pure `parseHybridSearchInput` (reject empty query, non-integer/out-of-range limit; max 50) and `toPublicSearchResult` (never serializes vectors). `GET /api/search` validates first, embeds via `embedText`, calls `searchCompanies`, returns `{ results }` with generic 400/502/503 JSON (no driver/provider text). Hermetic evals in `src/eval/hybrid-search.eval.ts`. Marked feature completed; advanced horizon past this feature.
- **Why:** Hybrid discovery was unreachable without a validated route that embeds the query and ranks via existing SQL.
- **Commands:**
  - `npm ci` (worktree had no `node_modules` for build)
  - Eval canary: `semantic: 0.5` → weight eval exit 1; empty-query gate disabled → parse eval exit 1; restored → 8/8 pass
  - `npm run verify` → exit 0 (lint, typecheck, 92 evals, build). Route table includes `ƒ /api/search`. Build succeeded without DATABASE_URL or OPENAI_API_KEY.
- **Human notes:** No new dependencies. Did not implement search-ui or hybrid-search-ranking-eval ranking fixtures. Did not change weight values or `HNSW_EF_SEARCH` (200). SQL shape unchanged except named weight parameters and omitting embedding from SELECT; intended plan still HNSW + trigram filters with LIMIT (no live EXPLAIN without DATABASE_URL).

## continue-20260812-164834 (hybrid-search-ranking-eval)

- **Worktree / branch:** `.harness/worktrees/continue-20260812-164834` / `harness/continue-local-20260812-164834`
- **Task / plan:** `hybrid-search-ranking-eval` / `plan-20260812112008`
- **What changed:** Pure module `src/lib/hybrid-search-ranking.ts` owns `HYBRID_SEARCH_WEIGHTS` (0.7/0.2/0.1), filter thresholds (minSemantic 0.25, minNameTrigram 0.3), `hybridRelevanceScore`, `passesHybridFilter`, and `rankHybridResults`. `searchCompanies` imports those named constants so SQL thresholds cannot drift. Hermetic eval `src/eval/hybrid-search-ranking.eval.ts` locks fixture order `sem-king > mid > full-boost > name-king`, drops below-threshold noise, and checks weight-swap reorders. Marked feature completed; advanced horizon to search-ui head.
- **Why:** Hybrid ranking weights are product behaviour; without an ordering eval they can regress while the build stays green.
- **Commands:**
  - `npm ci` (worktree had no `node_modules` for build)
  - Canary: set product weights to semantic 0.2 / nameTrigram 0.7 → `npm run eval` exit 1 (4 fails, including `orders fixtures by product weights` actual order `name-king,mid,full-boost,sem-king`); restored → exit 0 (101 pass)
  - `npm run eval` → exit 0 (101 tests)
  - `npm run verify` → exit 0 (lint, typecheck, evals, build). Build succeeded without DATABASE_URL.
- **Human notes:** No new dependencies. Did not implement search-ui, company-ingestion-refresh, or server-render-company-grid. Did not change weight numeric values or `HNSW_EF_SEARCH` (200). No app/route/component changes. No secrets read or written.

## local-20260813 (server-render-company-grid)

- **Worktree / branch:** local maintainer checkout / `feat/server-render-company-grid`
- **Task / plan:** `server-render-company-grid` / no planner artifact; maintainer-run session, not a continuation
- **What changed:** Dropped `'use client'` from the company card, the company grid, and the pagination control. Image load-failure state moved into one client leaf, `src/components/company-logo.tsx`, now used by both the card and the detail header (the detail header previously had no fallback at all). Added pure tag display helpers in `src/lib/company-tags.ts` and used them in the card instead of inline slicing. Grid now takes a `readonly Company[]`.
- **Why:** Those three components held no state, ran no effect, and touched no browser API, so they shipped client JavaScript for markup the server can render. The card's only reason to be a client component was the logo `onError` handler.
- **Commands:**
  - `npm run verify` → exit 0 (lint, typecheck, evals, build). Build succeeded without `DATABASE_URL`.
  - Eval canary: added `'use client'` to `company-grid.tsx` → `client-boundaries` eval exit 1; removed → pass.
- **Human notes:** No new dependencies. No SQL, schema, or route changes. `src/eval/client-boundaries.eval.ts` now fails any new `'use client'` that is not allowlisted with a reason, so the boundary policy in `.agents/rules/nextjs-react.md` is enforced rather than asserted. README status section refreshed: it still claimed search and the detail route did not exist.

## local-20260814 (search-observability)

- **Worktree / branch:** local maintainer checkout / `feat/search-observability`
- **Task / plan:** `search-observability` / no planner artifact; maintainer-run session, not a continuation. Feature defined in this run at priority 23.
- **What changed:** New `src/lib/observability/`: `search-event.ts` holds the outcome taxonomy (`ok`, `invalid_request`, `embed_unavailable`, `search_failed`), fixed latency buckets, query bounding with credential scrubbing, and the pure event builder; `emit.ts` writes one JSON line and is the only I/O. `GET /api/search` now times the embed and query phases separately and emits exactly one event on every exit path, with the result count taken from the public results the client actually receives.
- **Why:** Search had three distinct failure modes (bad input, embedding provider down, database down) and none of them were visible once the response was sent. Latency was equally invisible, so a slow embed and a slow query looked identical.
- **Commands:**
  - `npm run verify` → exit 0 (lint, typecheck, 123 evals, build). Build succeeded without `DATABASE_URL` or `OPENAI_API_KEY`.
  - Eval canary: widened `MAX_LOGGED_QUERY_CHARS` and dropped a credential pattern → `search-event` eval exit 1; restored → pass.
- **Human notes:** No new dependencies. Event shape is deliberately fixed across outcomes so log queries do not need per-outcome key knowledge. The query prefix is scrubbed before truncation, so a secret cannot be half-logged. No SQL, schema, or UI changes.

## local-20260815 (db-resilience)

- **Worktree / branch:** local maintainer checkout / `feat/db-resilience`
- **Task / plan:** `db-resilience` / no planner artifact; maintainer-run session, not a continuation. Feature defined in this run at priority 24.
- **What changed:** New `src/db/resilience.ts`: narrow transient-failure classification by message shape, a deterministic exponential backoff with injected jitter, `STATEMENT_TIMEOUT_MS`, and `withRetry` with injectable sleep. `getCompanyById` and `searchCompanies` now retry transient failures only. `searchCompanies` applies `hnsw.ef_search` and `statement_timeout` through `set_config(..., true)` inside one `sql.transaction([...])` with the SELECT, and returns a generic `Search query failed` instead of driver text.
- **Why:** Two real defects, not just hardening. `SET hnsw.ef_search = ${value}` sent the value as a bound parameter, which Postgres rejects for `SET`; and over the Neon HTTP driver each statement is its own transaction, so even valid session settings never reached the following query. A transient network fault also failed the whole request with no retry, and the failure result carried driver text naming columns and hosts.
- **Commands:**
  - `npm run verify` → exit 0 (lint, typecheck, 134 evals, build). Build succeeded without `DATABASE_URL`.
  - Eval canary: made `isTransientDatabaseError` return `true` for everything → `db-resilience` eval exit 1; restored → pass.
- **Human notes:** No new dependencies. The `set_config` change is the only SQL shape change and could not be run against a live database in this session (no `DATABASE_URL` in the checkout): worth confirming with one live query that `hnsw.ef_search` now shows the intended value via `SHOW hnsw.ef_search` inside the same transaction. Retry is deliberately absent from the listing and count queries; add it only if those show transient failures in the new telemetry.

## local-20260816 (company-ingestion-refresh)

- **Worktree / branch:** local maintainer checkout / `feat/company-ingestion-refresh`
- **Task / plan:** `company-ingestion-refresh` / no planner artifact; maintainer-run session, not a continuation
- **What changed:** New `src/lib/ingestion/`: `source-record.ts` validates untrusted source payloads field by field (rejecting records without identity or name, dropping non-http URLs, refusing to invent a team size from a string); `checksum.ts` hashes the fields a source owns, plus a second hash of exactly the text that gets embedded; `refresh-plan.ts` decides insert / update / touch with a separate re-embed flag, and makes a run resumable by `source_id` cursor. DB gained `getCompanyBySource`, `insertCompanyFromSource`, `updateCompanyFromSource`, and `touchCompanySyncedAt`, all parameterized and retried. `scripts/ingest-companies.ts` runs it, with `--dry-run`, `--cursor`, and `--max`. The shared `httpUrl` guard moved out of `company-detail.tsx` into `src/lib/safe-url.ts`.
- **Why:** Nothing populated or refreshed companies, so the embedding pipeline and search had no source of truth to track. A refresh that re-embeds everything it touches is also the expensive way to do it: most source changes never alter the embedded text.
- **Commands:**
  - `npm run verify` → exit 0 (lint, typecheck, 159 evals, build). Build succeeded without `DATABASE_URL`.
  - Eval canary: the decision-matrix eval caught a real bug during this session, where the checksum hashed the wrapper's `id` / `source_id` fields and so no record ever compared as unchanged. Fixed by hashing only `COMPANY_CONTENT_KEYS`, with an eval that fails if that list drifts from `CompanyContent`.
- **Human notes:** No new dependencies. The insert and update statements could not be run against a live database in this session (no `DATABASE_URL` in the checkout): the column list follows `src/db/types.ts`, and a first live run should use `--dry-run` and then `--max=1`. Insert deliberately does not use `ON CONFLICT`, because no unique index on `(source, source_id)` is asserted anywhere in this repository; the script is a single writer and reads before it writes. `source_metadata`, `slug`, and `founded_at` are left to their column defaults.

## local-20260817 (research-agent-runtime)

- **Worktree / branch:** local maintainer checkout / `feat/research-agent-runtime`
- **Task / plan:** `research-agent-runtime` / no planner artifact; maintainer-run session, not a continuation
- **What changed:** New `src/lib/research/`: `types.ts` declares sources, findings (`field` / `value` / `evidence_url` / `observed_at` / `confidence`), and per-source outcomes; `website.ts` extracts the page title and meta description from fetched HTML as a pure function, with the fetch itself behind a 5s `AbortSignal.timeout`; `run.ts` folds outcomes into a run and decides `complete` / `partial` / `failed`; `runtime.ts` runs each collector with failure isolation and bounds what a failing source can write into the record. DB gained `insertResearchRun` (run plus findings in one transaction, client-generated run id) and `getLatestResearchRun` (rows narrowed field by field, unknown status treated as failed). `migrations/0001_company_research.sql` holds the DDL. `scripts/run-research.ts` runs it with `--dry-run` and `--limit`.
- **Why:** The repository is named for background research agents and had none. The requirement that mattered most was honesty: a run that loses a source must read as partial, and a partial run must not be half-written.
- **Commands:**
  - `npm run verify` → exit 0 (lint, typecheck, 177 evals, build). Build succeeded without `DATABASE_URL`.
  - Eval canary: made `runStatus` return `complete` when a single source failed → `research-runtime` eval exit 1 (7 fails); restored → 177 pass.
- **Human notes:** No new dependencies; HTML is read with two anchored regexes rather than a parser, and both values are whitespace-collapsed, entity-decoded, and bounded to 300 characters. **Blocker for a live run:** `migrations/0001_company_research.sql` has not been applied anywhere, and nothing in this repository applies migrations. Until a human applies it, `insertResearchRun` and `getLatestResearchRun` return failure results, which callers are expected to treat as "no research yet". `company_id` is `text` with no foreign key because nothing in the repository asserts the type of `companies.id`; add the constraint once it is known. Only one collector exists (`website`), so `RESEARCH_SOURCES` has one entry by design rather than a list of intentions.

## local-20260818 (research-evidence-and-freshness)

- **Worktree / branch:** local maintainer checkout / `feat/research-evidence-freshness`
- **Task / plan:** `research-evidence-and-freshness` / no planner artifact; maintainer-run session, not a continuation
- **What changed:** `src/lib/research/freshness.ts` computes the age of an observation with `now` passed in, bands it as fresh (<= 7 days) / aging (<= 30) / stale, and describes it in words that get coarser with age. `src/lib/research/evidence.ts` turns findings into display items: a sentence-cased label, the claim, a source link only when the stored URL is http(s), the freshness band, and the age. `src/components/company-evidence.tsx` renders that on the company profile, with a partial-run notice naming the sources that did not report, an empty state that distinguishes "never researched" from "found nothing", and `<time dateTime>` for real timestamps. The detail route now reads the company and its research with `Promise.all`.
- **Why:** The runtime recorded a source and a timestamp per finding and nothing surfaced either, so a reader could not tell a claim observed today from one observed in January, or a complete run from a partial one.
- **Commands:**
  - `npm run verify` → exit 0 (lint, typecheck, 195 evals, build). Route table still includes `ƒ /companies/[id]`. Build succeeded without `DATABASE_URL`.
  - Eval canary: widening the fresh band to 90 days passed at first, because the eval derived its expectations from the constants it was meant to lock. The eval now asserts `{ fresh: 7, aging: 30 }` and two fixed cases; the same canary then failed (2 fails) and restoring returned 198 pass.
- **Human notes:** No new dependencies. A stored `javascript:` or `data:` evidence URL renders as no link at all while the claim itself still renders, and that is covered by an eval. Freshness thresholds are product values in one place (`FRESHNESS_THRESHOLDS_DAYS`); changing them changes what users are told and fails the eval. The evidence section reports "no research yet" whenever the read fails, which is also what happens while `migrations/0001_company_research.sql` remains unapplied.

## local-20260819 (research-quality-eval)

- **Worktree / branch:** local maintainer checkout / `feat/research-quality-eval`
- **Task / plan:** `research-quality-eval` / no planner artifact; maintainer-run session, not a continuation
- **What changed:** `src/lib/research/quality.ts` measures enrichment: per-field coverage (per field, not averaged, because one field at 100% hides another at zero), the freshness mix of every finding, the share of runs that lost a source, and the share of profiles whose every claim has gone stale. `qualityViolations` returns readable lines rather than a boolean, so a regression says which measure moved. `src/eval/fixtures/research-runs.json` is the recorded corpus, carrying its own `recorded_as_of` so freshness is deterministic; `src/eval/research-corpus.eval.ts` checks the corpus is shaped like something the runtime could have produced (a complete run with recorded failures fails the check, as does evidence that is not an http URL) and then asserts it clears the bar. `scripts/record-research-fixture.ts` writes a real run into the corpus and prints the report and any violations before writing.
- **Why:** Coverage and freshness are now rendered to users, and nothing measured either. A bar that lives in a test file and is derived from the code it checks proves nothing, so the thresholds are product values in one place and the corpus is a recording rather than an assertion.
- **Commands:**
  - `npm run verify` → exit 0 (lint, typecheck, 221 evals, build). Build succeeded without `DATABASE_URL`.
  - Eval canary: dropped `website_description` from the corpus's four complete runs → `research-corpus` eval exit 1 naming the coverage that fell; restored → pass.
- **Human notes:** No new dependencies. The corpus is synthetic for now: six runs shaped like real ones, with one 403 failure and one profile that only yielded a title. Replace entries with real recordings via the script as soon as `migrations/0001_company_research.sql` is applied and `scripts/run-research.ts` has run; the bar values (coverage 0.6, stale 0.25, partial 0.34) were set to what this corpus actually achieves, so they should be revisited against real data rather than treated as targets. `partial` runs are impossible while only one collector exists, which is why `research-source-expansion` is queued next.

## continue-20260820-232807 (research-source-expansion)

- **Worktree / branch:** `.harness/worktrees/continue-20260820-232807` / `harness/continue-local-20260820-232807`
- **Task / plan:** `research-source-expansion` / `plan-20260820180036`
- **What changed:** Added `careers` to `RESEARCH_SOURCES` and `DEFAULT_COLLECTORS`. New `src/lib/research/careers.ts` mirrors the website collector: derive `/careers` from `ResearchSubject.website` via `httpUrl`, pure `parseCareersFindings` (title + meta description, entity decode, 300-char bound, no HTML parser), thin `collectCareersFindings` with 5s `AbortSignal.timeout`. Missing or non-http website yields zero findings; non-ok careers HTTP throws so a successful website alone is `partial`. Hermetic `src/eval/research-careers.eval.ts` covers parse, URL safety, null-website collect, and multi-source partial runs. Horizon advanced to `research-scheduler`. Queued follow-up `research-careers-quality-fields` so EXPECTED_FIELDS stay website-only until real multi-source fixtures exist.
- **Why:** One collector meant a profile rested on one page and a run could never be genuinely partial. A second source makes the honesty path real.
- **Commands:**
  - `npm run verify` → exit 0 (lint, typecheck, 233 evals, build). Build succeeded without `DATABASE_URL`.
  - Eval canary: made `careersPageUrl` return the website without `/careers` → `research-careers` eval 1 fail (`derives /careers from an http website`); restored → 11/11 pass.
- **Human notes:** No new dependencies; no schema or UI changes. Scripts already use `DEFAULT_COLLECTORS`, so they pick up careers without edits. Live careers pages that 404 will correctly partial the run; companies without a website still complete on empty careers findings. Do not raise EXPECTED_FIELDS for careers until the corpus has recorded multi-source runs.

## continue-20260820-234440 (research-scheduler)

- **Worktree / branch:** `.harness/worktrees/continue-20260820-234440` / `harness/continue-local-20260820-234440`
- **Task / plan:** `research-scheduler` / `plan-20260820181605`
- **What changed:** Added pure `selectResearchSchedule` (clock-injected) that prefers missing then oldest-stale then aging, skips fresh with reason `fresh`, and records `over_cap` past the batch limit. Added `listCompaniesForResearchSchedule`: one parameterized LATERAL newest-finding query, ordered NULLS FIRST / oldest-first, bounded LIMIT. Wired `scripts/run-research.ts` to fetch a capped candidate page, select up to `--limit` (default 10), print skip counts, keep `--dry-run` write-free. Hermetic `src/eval/research-schedule.eval.ts` locks ordering, fresh skips, and the concurrency cap. Horizon advanced past this feature; `search-ui` stays on the slice while excluded.
- **Why:** Research still ran by hand over arbitrary company pages. Cadence needs stale-first selection and a hard cap so a schedule cannot stampede, with every skip recorded.
- **Commands:**
  - Eval canary: temporarily ignored the selection cap so `selected` could exceed `limit` → schedule evals failed (cap and zero-limit cases); restored → pass.
  - `npm run verify` → exit 0 (lint, typecheck, 238 evals, build). Build succeeded without `DATABASE_URL`. Worktree needed `npm ci` once (empty `node_modules`).
- **Human notes:** No new dependencies; no Trigger.dev; collectors and EXPECTED_FIELDS unchanged. Intended EXPLAIN for the schedule query: index on `company_research_findings (company_id, observed_at DESC)` plus companies PK; LATERAL one row per company; outer LIMIT bounds the page. Migrations still human-applied; live schedule needs `DATABASE_URL` and applied DDL like the previous research script.

## continue-20260821-155625 (research-multi-source-corpus)

- **Worktree / branch:** `.harness/worktrees/continue-20260821-155625` / `harness/continue-local-20260821-155625`
- **Task / plan:** `research-multi-source-corpus` / `plan-20260821102846`
- **What changed:** Grew `src/eval/fixtures/research-runs.json` with fixture-company-7 (complete website+careers, including careers_title and careers_description) and fixture-company-8 (partial: website succeeded, careers 404). Tightened `src/eval/research-corpus.eval.ts` so attempted/succeeded/failed/finding sources must be members of RESEARCH_SOURCES, and locked the presence of one complete multi-source run plus one careers-failed partial. EXPECTED_FIELDS and QUALITY_BAR left unchanged (partialShare 2/8 = 0.25 under maxPartialShare 0.34). Horizon advanced; registered research-observability and research-evidence-source-labels in feature_list so the horizon only references real features; careers-quality-fields now depends on research-multi-source-corpus.
- **Why:** CI was measuring a website-only corpus after DEFAULT_COLLECTORS already includes careers. Honest multi-source fixtures unlock careers quality fields without inventing coverage.
- **Commands:**
  - Eval canary: dropped careers from fixture-company-7 attempted/succeeded → corpus eval failed (`corpus lacks a complete website+careers run`); restored → pass.
  - `npm run verify` → exit 0 (lint, typecheck, 239 evals, build). Build succeeded without `DATABASE_URL`. Worktree needed `npm ci` once (empty `node_modules`).
- **Human notes:** No new dependencies; no collector/runtime/UI/SQL changes; no QUALITY_BAR or EXPECTED_FIELDS edits. Next natural task is research-careers-quality-fields.

## continue-20260821-173238 (research-careers-quality-fields)

- **Worktree / branch:** `.harness/worktrees/continue-20260821-173238` / `harness/continue-local-20260821-173238`
- **Task / plan:** `research-careers-quality-fields` / `plan-20260821120344`
- **What changed:** Extended `EXPECTED_FIELDS` to `website_title`, `website_description`, `careers_title`, `careers_description`. Upgraded fixture-company-1..4 from complete website-only to complete website+careers (careers findings with `/careers` evidence URLs), keeping fixture-company-7 multi-source complete and fixture-company-8 careers-failed partial. Locked the four-field list and QUALITY_BAR thresholds in `research-quality.eval.ts`; asserted careers coverage >= 0.6 in `research-corpus.eval.ts`. Horizon advanced past this feature. Careers fieldCoverage on the corpus is 5/8 (0.625); partialShare remains 2/8 (0.25).
- **Why:** Multi-source fixtures already existed but CI still measured website-only coverage. Extending the bar locks the second source without loosening thresholds.
- **Commands:**
  - Eval canary (fixtures): stripped careers from fixture-company-1 → corpus eval failed (`careers_* coverage 0.50 is below 0.6`); restored → pass.
  - Eval canary (EXPECTED_FIELDS): dropped careers fields → quality eval failed (`expects website and careers fields`); restored → pass.
  - `npm run verify` → exit 0 (lint, typecheck, 241 evals, build). Build succeeded without `DATABASE_URL`.
- **Human notes:** No new dependencies; no collector/runtime/UI/SQL changes; QUALITY_BAR numeric thresholds unchanged. Next natural slice head is search-ui (still excluded in-flight) or research-observability.

## continue-20260905-174425 (research-evidence-source-labels)

- **Worktree / branch:** `.harness/worktrees/continue-20260905-174425` / `harness/continue-local-20260905-174425`
- **Task / plan:** `research-evidence-source-labels` / `plan-20260905121620`
- **What changed:** `EvidenceItem` now carries `source` (ResearchSourceId) and `sourceLabel` from a closed map (`Website`, `Careers`). `toEvidenceItems` copies `finding.source` through. `CompanyEvidence` renders the collector with a secondary Badge beside freshness. Extended `research-evidence.eval.ts` for website vs careers labels and kept unsafe URL href-null cases with label still present. Marked the feature completed; advanced horizon to research-observability then search-ui.
- **Why:** Findings already stored ResearchSourceId but the evidence mapping and UI dropped it, so readers had to infer the collector from field names.
- **Commands:**
  - Eval canary: dropped `source` / `sourceLabel` from `toEvidenceItems` → research-evidence eval failed (undefined vs Website/Careers); restored → 8/8 pass on that file.
  - `npm run verify` → exit 0 (lint, typecheck, 242 evals, build). Build succeeded without `DATABASE_URL`. Worktree needed `npm ci` once (empty `node_modules`).
- **Human notes:** No new dependencies; no collector/runtime/SQL/API changes. `company-evidence.tsx` remains a Server Component. Next slice head is research-observability (often excluded in-flight) or search-ui.

## continue-20260905-181432 (research-evidence-confidence)

- **Worktree / branch:** `.harness/worktrees/continue-20260905-181432` / `harness/continue-local-20260905-181432`
- **Task / plan:** `research-evidence-confidence` / `plan-20260905124718`
- **What changed:** `EvidenceItem` now carries `confidence` (FindingConfidence) and `confidenceLabel` from a closed map (`High`, `Medium`, `Low`). `toEvidenceItems` copies `finding.confidence` through. `CompanyEvidence` renders confidence with a secondary Badge beside source and freshness. Extended `research-evidence.eval.ts` for high/medium fixtures and kept unsafe URL href-null cases with confidenceLabel still present. Registered and marked the feature completed; advanced horizon past it to research-observability then search-ui.
- **Why:** Collectors already store FindingConfidence but the evidence mapping and UI dropped it, so readers could not tell stronger claims from weaker ones beside source and freshness.
- **Commands:**
  - Eval canary: dropped `confidence` / `confidenceLabel` from `toEvidenceItems` → research-evidence eval failed (undefined vs High/Medium); restored → 9/9 pass on that file.
  - `npm run verify` → exit 0 (lint, typecheck, 243 evals, build). Build succeeded without `DATABASE_URL`. Worktree needed `npm ci` once (empty `node_modules`).
- **Human notes:** No new dependencies; no collector/runtime/SQL/API changes. `company-evidence.tsx` remains a Server Component. Next slice head is research-observability (often excluded in-flight) or search-ui.
