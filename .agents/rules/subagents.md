# Subagents

Split independent work across parallel subagents. Keep writes single-threaded.

**Parallelise when:**

- Several files need independent changes.
- You are exploring unrelated areas of the codebase at once.
- Tasks have no shared state and no ordering between them.

**Handle directly when:**

- It is a single edit or a quick lookup.
- Steps depend on each other in sequence.
- The coordination costs more than the work.

**Never parallelise writes to the same branch or worktree.** Investigation fans out; implementation does not. One writer per branch is the rule that keeps the autonomous loop from corrupting its own state.

When uncertain whether two tasks are independent, they are not. Sequence them.
