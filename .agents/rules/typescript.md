# TypeScript

Depth lives in [`.agents/skills/typescript-advanced-types/`](../skills/typescript-advanced-types/SKILL.md). This file is the always-on subset.

- `strict` is on. Do not weaken `tsconfig.json` to make an error go away.
- No `any`. Reach for `unknown` plus a narrowing check, or model the type properly.
- No `@ts-expect-error` or `@ts-ignore` without a comment saying why, and never in new code you control.
- No non-null assertion (`!`) to silence the compiler. If a value can be absent, handle the absence.
- Prefer discriminated unions over optional-field soup. `QueryResult<T>` in `src/db/types.ts` is the house pattern for fallible calls.
- Type at the boundaries: exported function signatures are explicit, internals infer.
- Data crossing a runtime boundary (request, database row, external API) is validated, not cast. A cast is an assertion you have not checked.
