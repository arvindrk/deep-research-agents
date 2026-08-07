# Design system

Depth lives in [`.agents/skills/linear-design-system/`](../skills/linear-design-system/SKILL.md) and [`.agents/skills/web-design-guidelines/`](../skills/web-design-guidelines/SKILL.md). This file is the always-on subset.

- Tokens are the source of truth. Use the values in `src/design-system/tokens/` and the CSS variables they back. No hardcoded hex, px, or duration values in components.
- Compose classes with `cn()` from `src/lib/utils.ts`.
- Reuse before writing. Check `src/components/ui/` for an existing primitive before hand-rolling markup.
- Hover changes appearance, never position. No translate or scale on hover.
- Every interactive element has a visible focus state, an accessible name, and a hit target of at least 44px.
- Every list has a real empty state. Every async surface has a loading state and an error state.
- Images go through `next/image` with explicit dimensions and a fallback for a broken source.
