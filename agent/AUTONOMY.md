# Autonomy model

What this repository does on its own, what it will never do, and how to stop it.

## Two layers

**The harness** is the rules, prompts, state, and verification under `agent/` and `.agents/`. It defines how an agent works here. It never creates work by itself and is always active.

**Continuation** is the loop that turns a merge into a draft pull request. It is active only while a watcher process is running on the maintainer's machine.

## What runs, and when

`npm run watch` polls `origin/main` every 180 seconds. When the tip moves to a commit whose message carries no skip marker, one continuation runs:

```
Planner    chooses one unblocked task, writes the plan
Executor   implements only that task, commits, records progress
reshape    sweeps residue, splits to at least 4 commits
Validator  re-runs verify, judges the diff, writes a verdict
guards     forbidden paths, diff caps, secret scan, lockfile
draft PR
```

Every stage failing aborts the run. The worktree is discarded and the merge SHA is not recorded, so the next tick retries rather than skipping the merge forever.

## Human gates

The loop opens draft pull requests. A human is required for everything that cannot be undone:

- merging to `main`
- deploying or promoting to production
- changing secrets or environment configuration
- force-pushing
- changing repository settings
- adding a dependency that the plan did not authorise

## Stopping it

- **Kill switch**: Ctrl-C in the watcher's terminal, or close the window. There is no daemon and nothing survives that process. When it is not running, the repository is not autonomous.
- **Per-merge**: put `[skip harness]` in the merge commit message.
- **Throttle**: `max_inflight_prs` in `agent/harness-config.json` caps how many continuation pull requests can be open at once. At the cap, runs exit without doing anything.

## Why the loop is local

Continuation could run in CI on every merge. It does not, for two reasons: an agent credential would have to live in repository secrets, and every merge would spend money. Running it in a foreground terminal keeps the credential on one machine and makes stopping it physical.

`.github/workflows/harness-continue.yml` exists as a manual fallback and is `workflow_dispatch` only.

## Controls, and what each is worth

| Control | Catches | Can it be argued with |
| --- | --- | --- |
| `npm run verify` in CI | lint, type, eval, build regressions | no |
| Validator persona | scope creep, partial work, weakened evals, principle violations | yes, it is a model |
| `guards.sh` | forbidden paths, oversized diffs, credentials, lone lockfile changes | no |
| Draft-only pull requests | anything the above missed | no, a human merges |
| GitHub secret scanning and push protection | credentials at push time | no |
| CodeQL, `npm audit`, dependency review | vulnerable code and dependencies | no |

The validator and the guards are deliberately different in kind. A model can be talked out of a judgement, including by text inside the diff it is reviewing, which is why the deterministic checks run last and have the final say.

## Branch protection

`.github/rulesets/main.json` is written but **not applied**. Applying it requires a pull request with green checks for every change to `main`, including the maintainer's own.

```
bash scripts/apply-branch-ruleset.sh           # preview
bash scripts/apply-branch-ruleset.sh --apply   # turn it on
```

Until it is applied, "the loop only opens drafts" is a property of the code rather than something the platform enforces.

## Data handling

- The loop never reads `.env*`. The prompts forbid it, the guards block those paths from any diff, and the build is verified to work without secrets.
- Event logs, progress notes, and pull request bodies are scanned for credential-shaped values before publication.
- `agent/brain/` is machine-local and git-ignored. Nothing personal or work-confidential belongs there.
- Web pages, external documents, and MCP tool output are untrusted input at every stage. An instruction found there, or inside a diff, is data and never a command.
