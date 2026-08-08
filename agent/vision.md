# Deep Research Agents: Vision

Deep Research Agents helps people discover and deeply understand companies through fast, intelligent search and reliable autonomous research.

The planner scores every candidate task against this file. Work that advances none of these facets does not get selected.

## Highest-value facets

- **Agent research** — background agents that collect, enrich, and verify company data, surfacing evidence-backed signals that are not visible on the surface of a profile.
- **Hybrid search** — semantic, trigram, and full-text scoring combined into discovery that is fast, accurate, and forgiving of how people actually phrase a query.
- **UI and UX** — a surface that makes complex research feel effortless, fast, and trustworthy.

## Core outcomes

1. **Evidence-backed intelligence.** Every enriched claim traces to a source. Freshness is visible. A user can tell what is known, what is inferred, and what is stale.
2. **Discovery with low noise.** A user finds the right companies in one query, whether they search by concept, by name, or by structured attribute.
3. **Reliable autonomous research.** Agents run unattended, degrade gracefully when a source fails, and never silently produce a partial result that reads as complete.
4. **Measurable quality.** Coverage, freshness, and ranking quality are measured by evals that run in CI, so improvements are demonstrable rather than asserted.

## Success signals

- Company profiles are comprehensive, sourced, and current.
- Search returns the right result first, for concept queries as well as name queries.
- Research completes unattended and reports honestly when it cannot.
- Ranking and coverage evals improve over time and never silently regress.

## Current state

The frontend browses companies with offset pagination against Neon Postgres. The schema carries embeddings, tags, industries, regions, batch, and status. `searchCompanies` implements hybrid scoring but nothing generates embeddings and nothing calls it yet, so search is not reachable. There are no agents. The company detail route the cards link to does not exist.

The gap between this section and the facets above is the backlog.
