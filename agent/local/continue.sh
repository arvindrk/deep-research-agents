#!/usr/bin/env bash
# One continuation: plan, execute, validate, guard, open a draft pull request.
#
# Every stage failing aborts the run. The worktree is discarded and the merge
# SHA is not recorded, so the next tick retries. Failing is cheap; a bad pull
# request that looks reviewed is not.
#
# Usage: continue.sh [base_sha]
set -euo pipefail

_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$_DIR/lib.sh"
# shellcheck source=guards.sh
source "$_DIR/guards.sh"
load_config

PROVIDER_FILE="$_DIR/providers/$AGENT_CMD.sh"
[[ -f "$PROVIDER_FILE" ]] || { log "no adapter for provider '$AGENT_CMD' at $PROVIDER_FILE"; exit 1; }
# shellcheck source=providers/grok.sh
source "$PROVIDER_FILE"
provider_available || { log "provider '$AGENT_CMD' is not on PATH"; exit 1; }

base_sha="${1:-origin/$BASE_BRANCH}"
ts="$(date +%Y%m%d-%H%M%S)"
branch="${BRANCH_PREFIX}${ts}"
worktree="$SCRATCH_DIR/worktrees/continue-$ts"
started="$(date +%s)"

init_run "$ts"
emit_event run.start base_sha="$base_sha" branch="$branch" provider="$AGENT_CMD" model="$AGENT_MODEL"

cleanup() {
  git -C "$REPO_ROOT" worktree remove --force "$worktree" 2>/dev/null || true
  # The remote branch carries the pull request; the local one is noise.
  git -C "$REPO_ROOT" branch -D "$branch" 2>/dev/null || true
}
trap cleanup EXIT

abort() {
  emit_event run.end status=failed reason="$1" duration_ms=$((($(date +%s) - started) * 1000))
  exit 1
}

# ── Worktree ────────────────────────────────────────────────────────────────

git -C "$REPO_ROOT" fetch --quiet origin
git -C "$REPO_ROOT" worktree add -b "$branch" "$worktree" "origin/$BASE_BRANCH" >/dev/null
mkdir -p "$worktree/.harness/tmp"
( cd "$worktree" && bash agent/init.sh >/dev/null 2>&1 ) || log "init.sh exited non-zero; continuing"

# ── In-flight guard ─────────────────────────────────────────────────────────
# Titles are "[feature-id] summary", so the open pull requests tell the planner
# what is already being worked on without any extra state to keep in sync.

inflight="$(gh pr list --repo "$REPO_GH" --base "$BASE_BRANCH" --state open \
  --json title,headRefName \
  --jq ".[] | select(.headRefName | startswith(\"$BRANCH_PREFIX\")) | .title" 2>/dev/null \
  | sed -nE 's/^\[([^]]+)\].*/\1/p' | sort -u || true)"
inflight_count="$(printf '%s' "$inflight" | grep -c . || true)"

emit_event guard.inflight count="$inflight_count" cap="$MAX_INFLIGHT_PRS"
if [[ "$inflight_count" -ge "$MAX_INFLIGHT_PRS" ]]; then
  log "$inflight_count open continuation PRs at cap $MAX_INFLIGHT_PRS; skipping"
  emit_event run.end status=skipped reason=inflight-cap
  exit 0
fi

# ── Prompt assembly ─────────────────────────────────────────────────────────

build_prompt() {
  local persona="$1"
  local out="$BRAIN_DIR/run/$ts-$persona-prompt.md"
  cat "$REPO_ROOT/agent/harness/$persona-prompt.md" > "$out"
  printf '%s' "$out"
}

run_persona() {
  local persona="$1" prompt="$2"
  emit_event phase.start phase="$persona"
  if ! provider_run "$prompt" "$worktree" "$RUN_DIR/$persona.stream.jsonl"; then
    log "$persona run failed; see $RUN_DIR/$persona.stream.jsonl"
    return 1
  fi
  emit_event phase.end phase="$persona"
}

# ── Plan ────────────────────────────────────────────────────────────────────

planner_prompt="$(build_prompt planner)"
if [[ -n "$inflight" ]]; then
  {
    printf '\n## Already in flight, do not select these\n\n'
    while IFS= read -r id; do [[ -n "$id" ]] && printf -- '- %s\n' "$id"; done <<<"$inflight"
  } >> "$planner_prompt"
fi

run_persona planner "$planner_prompt" || abort planner-failed

plan_file="$(find "$worktree/.harness/tmp" -name 'plan-*.json' -type f 2>/dev/null | sort | tail -1)"
if [[ -z "$plan_file" ]]; then
  log "planner produced no plan artifact"
  abort no-plan
fi
log "plan: $plan_file"

# ── Execute ─────────────────────────────────────────────────────────────────

executor_prompt="$(build_prompt executor)"
{
  printf '\n## The plan (authoritative)\n\n```json\n'
  cat "$plan_file"
  printf '\n```\n\nImplement only `chosen_task`, inside `execution_constraints`.\n'
} >> "$executor_prompt"

run_persona executor "$executor_prompt" || abort executor-failed

summary="$worktree/.harness/tmp/run-summary.json"
feature_id="$(json_field "$summary" feature_id)"
[[ -n "$feature_id" ]] && emit_event feature.selected feature_id="$feature_id" title="$(json_field "$summary" title)"

# ── Shape the branch ────────────────────────────────────────────────────────

commit_as_harness() {
  git -C "$worktree" -c user.name="harness" -c user.email="harness@localhost" commit --quiet "$@"
}
commits_ahead() { git -C "$worktree" rev-list --count "origin/$BASE_BRANCH..HEAD"; }

group_of() {
  case "$1" in
    agent/*) echo state ;;
    src/eval/*) echo test ;;
    docs/* | *.md) echo docs ;;
    package.json | package-lock.json | *.config.* | tsconfig* | .agents/* | .github/*) echo config ;;
    *) echo src ;;
  esac
}

message_for() {
  case "$1" in
    src) echo "feat: implement the selected task" ;;
    test) echo "test: cover the selected task" ;;
    docs) echo "docs: update documentation for the selected task" ;;
    config) echo "chore(config): update configuration for the selected task" ;;
    state) echo "chore(agent): record progress and feature state" ;;
  esac
}

if [[ -z "$(git -C "$worktree" status --porcelain)" && "$(commits_ahead)" -eq 0 ]]; then
  log "no changes produced"
  emit_event run.end status=no-changes duration_ms=$((($(date +%s) - started) * 1000))
  exit 0
fi

# Sweep anything the executor left uncommitted.
if [[ -n "$(git -C "$worktree" status --porcelain)" ]]; then
  git -C "$worktree" add -A
  commit_as_harness -m "chore: commit remaining continuation changes"
fi

# The executor is told to commit incrementally. When it does not, rebuild the
# branch by semantic group. Safe because nothing has been pushed yet.
if [[ "$(commits_ahead)" -lt "$MIN_COMMITS_PER_PR" ]]; then
  # Read loop rather than mapfile: macOS ships bash 3.2, which has no mapfile.
  changed=()
  while IFS= read -r changed_file; do
    [[ -n "$changed_file" ]] && changed+=("$changed_file")
  done < <(git -C "$worktree" diff --name-only "origin/$BASE_BRANCH...HEAD")

  if [[ "${#changed[@]}" -gt 0 ]]; then
    log "only $(commits_ahead) commit(s); rebuilding as $MIN_COMMITS_PER_PR+ semantic commits"
    git -C "$worktree" reset --quiet "origin/$BASE_BRANCH"
    for group in src test docs config state; do
      local_files=()
      for file in "${changed[@]}"; do
        [[ "$(group_of "$file")" == "$group" ]] && local_files+=("$file")
      done
      [[ "${#local_files[@]}" -eq 0 ]] && continue
      git -C "$worktree" add -A -- "${local_files[@]}"
      commit_as_harness -m "$(message_for "$group")"
    done
  fi
fi

# ── Validate ────────────────────────────────────────────────────────────────
# Runs against the final branch shape so its commit-discipline finding is not
# invalidated by the rebuild above.

run_persona validator "$(build_prompt validator)" || abort validator-failed

validation="$worktree/.harness/tmp/validation.json"
verdict="$(json_field "$validation" verdict)"
blockers="$(node -e '
  try {
    const findings = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).findings || [];
    process.stdout.write(String(findings.filter((f) => f.severity === "blocker").length));
  } catch { process.stdout.write("0"); }
' "$validation" 2>/dev/null || echo 0)"

emit_event validation verdict="${verdict:-missing}" blockers="${blockers:-0}"

# A missing verdict fails closed. Absence of evidence is not a pass.
if [[ "$verdict" != "pass" ]]; then
  log "validator returned '${verdict:-missing}' with ${blockers} blocker(s); not opening a pull request"
  abort "validation-${verdict:-missing}"
fi

# ── Guards ──────────────────────────────────────────────────────────────────

run_guards "$worktree" "origin/$BASE_BRANCH" || abort guards-failed

# ── Publish ─────────────────────────────────────────────────────────────────

additions="$(git -C "$worktree" diff --numstat "origin/$BASE_BRANCH...HEAD" | awk '{a+=$1} END {print a+0}')"
deletions="$(git -C "$worktree" diff --numstat "origin/$BASE_BRANCH...HEAD" | awk '{d+=$2} END {print d+0}')"
files="$(git -C "$worktree" diff --name-only "origin/$BASE_BRANCH...HEAD" | grep -c . || true)"
emit_event impl.changes files="$files" additions="$additions" deletions="$deletions" commits="$(commits_ahead)"

# Titles and bodies are agent-controlled text. They are written to files by node
# and passed to gh as arguments, never interpolated into a shell command.
body_file="$BRAIN_DIR/run/$ts-pr-body.md"
node -e '
  const fs = require("fs");
  const [summaryPath, validationPath, out, featureId, branch, baseSha] = process.argv.slice(1);
  const read = (p) => { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return {}; } };

  const summary = read(summaryPath);
  const validation = read(validationPath);
  const notes = (validation.findings || []).filter((f) => f.severity !== "blocker");

  const body = [
    summary.pr_body_md || `Autonomous continuation of \`${featureId}\`. The executor emitted no structured summary; see the \`agent/PROGRESS.md\` entry.`,
    "",
    "---",
    "",
    "### Validator",
    "",
    `Verdict **${validation.verdict || "unknown"}**, \`${validation.verify_command || "verify"}\` ${validation.verify_passed ? "passed" : "did not pass"}, secret scan ${validation.secret_scan_clean ? "clean" : "NOT clean"}.`,
    validation.summary ? `\n${validation.summary}` : "",
    notes.length ? "\nNon-blocking findings carried forward for review:\n" : "",
    ...notes.map((f) => `- **${f.severity}** (${f.category})${f.file ? ` \`${f.file}\`` : ""}: ${f.detail}`),
    "",
    "---",
    "",
    "### Traceability",
    "",
    `- Feature \`${featureId}\` in \`agent/feature_list.json\``,
    `- Plan artifact under \`.harness/tmp/\`, recorded in the \`agent/PROGRESS.md\` entry`,
    `- Autonomy model and human gates: \`agent/AUTONOMY.md\``,
    `- Generated off \`${baseSha}\` on branch \`${branch}\``,
    "",
    "Draft by design. This loop never merges and never deploys.",
  ].join("\n");

  fs.writeFileSync(out, body);
' "$summary" "$validation" "$body_file" "${feature_id:-unknown}" "$branch" "$base_sha"

guard_secret_text "$body_file" || abort secret-in-pr-body

raw_title="$(json_field "$summary" title)"
# Collapse to a single safe line: no control characters, bounded length.
title="[${feature_id:-unknown}] $(printf '%s' "${raw_title:-continuation}" | tr -d '\000-\037' | cut -c1-120)"

git -C "$worktree" push --quiet origin "$branch"

pr_url="$(gh pr create --repo "$REPO_GH" --draft \
  --base "$BASE_BRANCH" --head "$branch" \
  --title "$title" --body-file "$body_file")" || abort pr-create-failed

emit_event pr.opened url="$pr_url" title="$title"
emit_event run.end status=completed duration_ms=$((($(date +%s) - started) * 1000))
log "draft pull request opened: $pr_url"
