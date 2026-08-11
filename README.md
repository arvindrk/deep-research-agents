

# Deep Research Agents

An AI-powered research system that discovers, enriches, and surfaces insights about companies. A Next.js frontend renders results server-side from Neon Serverless Postgres, with vector embeddings for semantic search.

The repository improves itself: a merge to `main` triggers an autonomous loop that plans one task, implements it, validates the result, and opens a draft pull request for review.

## Status

Built today: the company listing with offset pagination, the Neon read layer, and the Linear design token set.

Not built yet: `searchCompanies` implements hybrid scoring but nothing generates embeddings, so search is unreachable; the company detail route does not exist; and the research agents are not written. That gap is the backlog in `agent/feature_list.json`, and `agent/vision.md` is what the planner scores it against.

## Architecture

- **Neon Postgres with `pgvector`** stores company records alongside embeddings
- **Hybrid search** combines semantic (70%), name trigram (20%), and full-text (10%) scoring
- **Next.js frontend** renders server-side, with no client-side data fetching
- **Agent harness** under `agent/` plans, implements, validates, and opens pull requests

## Tech stack

- **Framework**: Next.js 16 (App Router, React Server Components), React 19
- **Runtime**: Node.js 22+
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
