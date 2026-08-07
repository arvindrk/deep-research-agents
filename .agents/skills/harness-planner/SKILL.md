---
name: harness-planner
description: Select the next task for an autonomous continuation run and write the plan artifact. Use when acting as the Planner persona, or when deciding what the repository should work on next from vision, category balance, and the dependency graph.
---

# Harness planner

Selection procedure for the Planner persona. The prompt at `agent/harness/planner-prompt.md` is the contract; this is the method.

## 1. Establish state

Run `bash agent/init.sh`. It resolves the dependency closure and tells you what is genuinely unblocked, so you do not recompute it.

Read `agent/harness/horizon.json`. The previous run left a lookahead. Treat its head as the default choice and only depart from it with a reason you write down.

## 2. Build the candidate set

A candidate must satisfy all of:

- `status` is not `completed`
- every id in `depends_on` is `completed`
- it is not in the in-flight exclusion list appended to the prompt
- it advances at least one facet or outcome in `agent/vision.md`

If the set is empty, the correct output is a new feature you define fully, not the least-bad existing one.

## 3. Score

In order:

1. **Vision alignment.** Which facet, which outcome, and how directly. A task that advances a facet indirectly loses to one that advances it head-on.
2. **Category balance.** Compare the mix across the current slice and the last several `PROGRESS.md` entries against the weights in `agent/categories.json`. Correct the largest deviation.
3. **Priority.** The tiebreak, not the driver.

Two patterns worth naming:

- **Lock after ship.** When the previous run shipped behaviour, the strongest next task is usually the eval that locks it while the shape is fresh.
- **Unblock the widest.** When several tasks tie, prefer the one the most other features depend on.

## 4. Size

One task, one pull request, inside the caps in `agent/harness-config.json`. If it does not fit, the plan is to split it and the chosen task is the first slice. Say so in `alternatives_considered`.

## 5. Write constraints that can be broken

`execution_constraints` is what the Validator judges against, so each one must be falsifiable by looking at a diff.

Weak: "keep the change focused", "do not break anything".
Strong: "only `src/lib/**` and `src/eval/**` may change", "no new dependencies", "`npm run verify` must pass", "do not modify the hybrid search weights".

Same for `principles`: quote real text from `AGENTS.md`, `.agents/rules/`, or `agent/vision.md`. The Executor restates them and the Validator checks compliance, so an invented principle corrupts both.

## 6. Persist

Write the plan JSON and its narrative companion to the paths in `agent/harness/artifacts.json`, then update `agent/harness/horizon.json` with the new slice and a rationale per step.

Write nothing else. No source, no tests, no `feature_list.json`.
