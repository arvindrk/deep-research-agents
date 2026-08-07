# `.agents/`

Agent-readable operating instructions for this repository.

- `rules/` — always-on. One topic per file, thin, decision-level. Indexed by `AGENTS.md`.
- `skills/` — loaded on demand. Deep reference material, one directory per skill with a `SKILL.md` entrypoint.

The split is deliberate: a rule says what to decide, a skill says how to do it. When a rule needs depth, it links to a skill rather than repeating it.

No drafts, scratch notes, generated logs, or secrets. Everything here is loaded as instructions.
