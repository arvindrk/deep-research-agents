# Deep Research Agents

An AI-powered research system that discovers, enriches, and surfaces insights about companies. A Next.js frontend renders results server-side from Neon Serverless Postgres, with vector embeddings for semantic search.

The repository improves itself: a merge to `main` triggers an autonomous loop that plans one task, implements it, validates the result, and opens a draft pull request for review.

## Status

Built today: the company listing with offset pagination, the company detail route, the Neon read layer, the embedding pipeline, `GET /api/search` over hybrid ranking, and the Linear design token set. Company surfaces render on the server; the only client leaf is the logo, which owns image load-failure state.

Not built yet: the search interface, source ingestion and refresh, and the research agents themselves. That gap is the backlog in `agent/feature_list.json`, and `agent/vision.md` is what the planner scores it against.

## Architecture

- **Neon Postgres with `pgvector`** stores company records alongside embeddings
- **Hybrid search** combines semantic (70%), name trigram (20%), and full-text (10%) scoring
- **Next.js frontend** renders server-side, with no client-side data fetching
- **Measured research quality** holds enrichment to a bar in CI: per-field coverage, freshness mix, and the share of profiles that are stale or came from a run that lost a source, measured over a recorded corpus
- **Evidence and freshness** put a source link and an observation age on every enriched claim, banded fresh / aging / stale, so a reader can tell what is current and what is not
- **Research runtime** runs one enrichment source per company with per-source failure isolation: a run that loses a source is recorded as partial, never as complete, and a run and its findings are written in one transaction
- **Source ingestion** is resumable by source id cursor and idempotent per record: unchanged records only have their sync time touched, and re-embedding happens only when the embedded text changed
- **Resilient reads** retry transient database failures with jittered backoff, bound search with a statement timeout, and never surface driver text to a caller
- **Search telemetry** emits one structured JSON event per `/api/search` request: outcome, phase timings, latency bucket, result count, and a bounded query prefix with credential-shaped text scrubbed
- **Agent harness** under `agent/` plans, implements, validates, and opens pull requests

## Tech stack

- **Framework**: Next.js 16 (App Router, React Server Components), React 19
- **Database**: Neon Serverless Postgres with `pgvector`
- **Styling**: Tailwind CSS v4 with Linear design tokens
- **UI**: shadcn/ui, Radix, lucide-react
- **Language**: TypeScript

## Getting started

```bash
npm ci
```

```bash
# .env.local
DATABASE_URL=postgresql://...
```

```bash
npm run dev
```

## Commands

| Purpose | Command |
| --- | --- |
| Develop | `npm run dev` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Evals | `npm run eval` |
| Build | `npm run build` |
| Verify before a PR | `npm run verify` |
| Lint harness scripts | `npm run lint:shell` |
| Watch for merges | `npm run watch` |
| Inspect harness runs | `npm run logs` |

Two operator scripts sit outside `verify` and the build, and both take `--dry-run`:

```bash
npx tsx scripts/backfill-embeddings.ts --dry-run
npx tsx scripts/ingest-companies.ts --file=./companies.json --dry-run
npx tsx scripts/run-research.ts --dry-run --limit=5
npx tsx scripts/record-research-fixture.ts --company=<id>
```

`scripts/record-research-fixture.ts` writes a real run into `src/eval/fixtures/research-runs.json`, which is the corpus `npm run eval` measures enrichment against. Coverage, freshness, and partial-run shares below the bar in `src/lib/research/quality.ts` fail CI.

`scripts/run-research.ts` needs the tables in `migrations/0001_company_research.sql`. Migrations are applied by a human; nothing in this repository applies them.

The build runs without `DATABASE_URL` on purpose, so it can never start requiring secrets.

## The agent harness

`npm run watch` polls `main` and, on a new merge, runs one continuation in a throwaway worktree:

```
Planner    chooses one unblocked task from the backlog
Executor   implements only that task and records progress
Validator  re-runs verify, judges the diff, writes a verdict
guards     forbidden paths, diff caps, secret scan, lockfile
draft PR
```

Any stage failing aborts the run without pushing. The loop opens draft pull requests and never merges or deploys.

- `AGENTS.md` — the operating contract every agent reads first
- `agent/AUTONOMY.md` — what runs unattended, the human gates, and the kill switch
- `agent/harness/README.md` — the loop, the artifact contract, and the extension points
- `agent/vision.md` — the direction work is scored against

Stop it with Ctrl-C in the watcher's terminal, or suppress one merge with `[skip harness]` in its commit message.
