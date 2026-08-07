# Postgres and Neon

Depth lives in [`.agents/skills/neon-postgres/`](../skills/neon-postgres/SKILL.md). This file is the always-on subset.

## Parameterisation is not optional

Every value crosses the boundary as a parameter, through the `@neondatabase/serverless` tagged template:

```ts
await sql`SELECT * FROM companies WHERE id = ${id}`;
```

Never build a SQL string by concatenation or interpolation, not even for a value you believe is safe, and not even for identifiers you control. If a query shape genuinely has to vary, build the placeholder list programmatically and keep the values in the parameter array. Placeholder indices and the values array must stay the same length.

## Client access

Always go through `getDBClient()`. It resolves `DATABASE_URL` on first use, so importing the module stays side-effect free and the build needs no secrets. Do not construct a `neon()` client anywhere else.

## Query discipline

- Every new or changed query gets an `EXPLAIN ANALYZE` in the pull request.
- No sequential scan on `companies` in a user-facing path.
- Always bound results with `LIMIT`, and paginate anything a user can scroll.
- No N+1. Batch with `= ANY($1)` or a join instead of looping queries.
- Select the columns you need. `embedding` is large; omit it unless the caller uses it.

## Vectors

- Embeddings are `pgvector` columns queried with the `<=>` cosine distance operator against an HNSW index.
- Set `hnsw.ef_search` explicitly when recall matters, and treat the value as a tuned constant, not a magic number inline.
- Hybrid scoring weights (semantic, trigram, full-text) are product behaviour. Changing them changes results, so they need an eval that locks the ranking, not just a passing build.

## Errors

Query functions return `QueryResult<T>`, a discriminated union, rather than throwing. Keep that contract, and never put a raw driver error message containing a connection string into a response.
