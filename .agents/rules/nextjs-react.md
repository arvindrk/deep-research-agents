# Next.js and React

Depth lives in [`.agents/skills/next-best-practices/`](../skills/next-best-practices/SKILL.md) and [`.agents/skills/vercel-react-best-practices/`](../skills/vercel-react-best-practices/SKILL.md). This file is the always-on subset.

## Server by default

- Components are Server Components unless they need state, effects, or browser APIs. `'use client'` is a decision, not a default.
- Push the client boundary down. A page that fetches data stays on the server and passes plain data to the smallest client component that needs it.
- Data fetching happens on the server. No client-side fetch for data that the server already has.

## Async

- Independent awaits run in parallel with `Promise.all`. Sequential awaits that do not depend on each other are a bug.
- `params` and `searchParams` are promises in this Next version. Await them.
- Wrap slow subtrees in `Suspense` with a real fallback rather than blocking the whole route.

## State and effects

- Derive during render instead of mirroring one state value into another with an effect.
- An effect that only responds to a user action belongs in the event handler.
- Every effect declares complete dependencies. Do not trim the array to stop it firing; fix the design.

## Errors

Every route that can fail renders a real error state. A failed database call surfaces a message the user can act on, never a blank page and never a raw driver error.
