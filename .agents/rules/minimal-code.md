# Write minimal code

Write the least code that solves the problem. Read this whenever you are tempted to add scaffolding the requirement did not ask for.

## Don't

- Add abstractions, layers, or helpers without a concrete second caller.
- Write defensive code for cases that cannot happen: checks for impossible types, fallbacks, redundant validation.
- Use several `try`/`catch` blocks where one suffices. Do not catch an error you have no recovery path for.
- Add custom serialisers, registries, or generic utilities when a direct expression works.
- Leave self-explanatory comments. The code explains the what; comments are for non-obvious why.
- Reference ticket ids in code comments. Those belong in commit messages and pull requests.

## Do

- Pick the simplest expression that compiles and reads cleanly.
- Compute at the use site rather than caching state.
- Prefer one well-named function over three with internal helpers.
- Delete code that is no longer reachable in the same change.
- Search for an existing utility before writing a new one. Reuse beats writing.

If you are adding lines to make the structure feel complete, remove them.
