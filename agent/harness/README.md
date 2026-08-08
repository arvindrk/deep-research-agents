# Harness core

The reusable, project-agnostic part of the continuation loop. Project-specific direction lives outside this directory, in `agent/vision.md`, `agent/categories.json`, and `.agents/rules/`.

## The loop

A merge to `main` triggers one continuation. It runs three agent invocations in sequence inside a single throwaway worktree:

```
merge to main
  -> Planner    reads state, chooses one task, writes plan-<ts>.json
  -> Executor   restates principles, implements only that task, commits, writes run-summary.json
  -> Validator  re-runs verify, judges the diff against the plan, writes validation.json
  -> guards     path allowlist, diff caps, secret scan
  -> draft PR
```

Any stage failing aborts the run. The worktree is discarded, the merge SHA is not recorded, and the next tick retries. Failing is cheap; a bad pull request that looks reviewed is not.

The Validator is the piece ycagent.ai does not have. There, the executor certifies its own work, which is not a control.

## Personas

| Persona | Prompt | Writes | Never |
| --- | --- | --- | --- |
| Planner | `planner-prompt.md` | plan artifacts, `horizon.json` | source code, `feature_list.json` |
| Executor | `executor-prompt.md` | source, evals, `feature_list.json`, `PROGRESS.md`, run summary | push, open PRs |
| Validator | `validator-prompt.md` | `validation.json` only | any other file |

## Artifact contract

`artifacts.json` is the single source of truth for what each persona writes and where. The prompts describe those artifacts, `src/eval/prompt-contracts.eval.ts` asserts the prompts still describe them, and `agent/local/continue.sh` reads the paths from it. Change the contract in `artifacts.json` and the eval tells you which prompt has fallen out of step.

Prompt and wrapper drift is a real silent failure: the wrapper greps for a key the prompt has quietly stopped emitting, the parse returns empty, and the run degrades without anyone noticing.

## Feature list schema

`agent/feature_list.json` is an array. Every entry:

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | string | unique, kebab-case, stable once referenced |
| `status` | `pending` \| `in_progress` \| `completed` \| `blocked` | |
| `priority` | integer | unique across the file; lower is sooner |
| `category` | string | an id from `agent/categories.json` |
| `depends_on` | string[] | feature ids; the graph must stay acyclic |
| `description` | string | enough to plan from without reading code |
| `verify` | string | the exact command that proves it works |
| `passes` | boolean | whether `verify` last passed |

`src/eval/harness-state.eval.ts` enforces all of it, including that no completed feature depends on unfinished work.

## Extension points

- **Direction**: `agent/vision.md`, `agent/categories.json`
- **Rules**: `.agents/rules/`, always on
- **Caps and provider**: `agent/harness-config.json`
- **Personas**: the three prompts here, plus `.agents/skills/harness-*` for reusable procedure
- **Providers**: `agent/local/providers/`, one adapter per agent CLI

## Provider agnosticism

The orchestration layer knows nothing about any specific agent CLI. Each provider gets an adapter exposing one function, so switching is a config change rather than an edit to the loop. `agent/harness-config.json` sets the default; `AGENT_CMD` and `AGENT_MODEL` override it.

ycagent.ai hardcodes one vendor's flags in its continuation script and carries a comment conceding that switching providers requires wrapper edits. Adapters are why the scratch directory here is `.harness/` rather than a vendor name.
