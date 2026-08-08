#!/usr/bin/env bash
# Shared helpers for the continuation loop. Source this; do not execute it.
set -euo pipefail

_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$_LIB_DIR/../.." && pwd)"

CONFIG_FILE="$REPO_ROOT/agent/harness-config.json"
ARTIFACTS_FILE="$REPO_ROOT/agent/harness/artifacts.json"
BRAIN_DIR="$REPO_ROOT/agent/brain"
STATE_DIR="$BRAIN_DIR/state"
LOG_DIR="$BRAIN_DIR/logs"
RUNS_DIR="$LOG_DIR/runs"
SEQ_DIR="$LOG_DIR/.seq"
LOOP_LOG="$LOG_DIR/loop.jsonl"
LOCK_DIR="$BRAIN_DIR/locks/continue.lock.d"
export SCRATCH_DIR="$REPO_ROOT/.harness"

mkdir -p "$STATE_DIR" "$RUNS_DIR" "$SEQ_DIR" "$BRAIN_DIR/run" "$(dirname "$LOCK_DIR")"

log() { printf '[%s] %s\n' "$(date +%Y-%m-%dT%H:%M:%S)" "$*"; }

# ── Configuration ───────────────────────────────────────────────────────────
# Every tunable lives in agent/harness-config.json. Environment variables of the
# same name in upper case override it, so a one-off run needs no file edit.

json_get() {
  node -e '
    const [file, key, fallback] = process.argv.slice(1);
    try {
      const value = require(file)[key];
      process.stdout.write(value === undefined || value === null ? fallback : String(value));
    } catch {
      process.stdout.write(fallback);
    }
  ' "$1" "$2" "${3:-}"
}

load_config() {
  REPO_GH="${REPO_GH:-$(json_get "$CONFIG_FILE" gh_repo)}"
  REPO_DISPLAY="${REPO_DISPLAY:-$(json_get "$CONFIG_FILE" display_name "$(basename "$REPO_ROOT")")}"
  BASE_BRANCH="${BASE_BRANCH:-$(json_get "$CONFIG_FILE" base_branch main)}"
  AGENT_CMD="${AGENT_CMD:-$(json_get "$CONFIG_FILE" agent_cmd grok)}"
  AGENT_MODEL="${AGENT_MODEL:-$(json_get "$CONFIG_FILE" agent_model grok-4.5)}"
  AGENT_MAX_TURNS="${AGENT_MAX_TURNS:-$(json_get "$CONFIG_FILE" agent_max_turns 120)}"
  BRANCH_PREFIX="${BRANCH_PREFIX:-$(json_get "$CONFIG_FILE" branch_prefix harness/continue-local-)}"
  WATCH_INTERVAL="${WATCH_INTERVAL:-$(json_get "$CONFIG_FILE" watch_interval_seconds 180)}"
  MAX_INFLIGHT_PRS="${MAX_INFLIGHT_PRS:-$(json_get "$CONFIG_FILE" max_inflight_prs 5)}"
  MIN_COMMITS_PER_PR="${MIN_COMMITS_PER_PR:-$(json_get "$CONFIG_FILE" min_commits_per_pr 4)}"
  MAX_FILES_CHANGED="${MAX_FILES_CHANGED:-$(json_get "$CONFIG_FILE" max_files_changed 40)}"
  MAX_LINES_CHANGED="${MAX_LINES_CHANGED:-$(json_get "$CONFIG_FILE" max_lines_changed 1500)}"

  if [[ -z "$REPO_GH" ]]; then
    local url
    url="$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || true)"
    REPO_GH="$(printf '%s' "$url" | sed -E 's#^git@[^:]+:##; s#^https://[^/]+/##; s#\.git$##')"
  fi

  export REPO_GH REPO_DISPLAY BASE_BRANCH AGENT_CMD AGENT_MODEL AGENT_MAX_TURNS \
    BRANCH_PREFIX WATCH_INTERVAL MAX_INFLIGHT_PRS MIN_COMMITS_PER_PR \
    MAX_FILES_CHANGED MAX_LINES_CHANGED
}

# artifact_path <artifact> <field>: read a path out of the artifact contract, so
# the wrapper and the prompts cannot disagree about where a file lands.
artifact_path() {
  node -e '
    const [file, name, field] = process.argv.slice(1);
    const artifact = require(file).artifacts[name] || {};
    process.stdout.write(artifact[field] || "");
  ' "$ARTIFACTS_FILE" "$1" "$2"
}

# json_field <file> <key>: read one string field, empty when absent or unparseable.
json_field() {
  [[ -f "$1" ]] || { printf ''; return 0; }
  node -e '
    const [file, key] = process.argv.slice(1);
    try {
      const value = JSON.parse(require("fs").readFileSync(file, "utf8"))[key];
      process.stdout.write(value === undefined || value === null ? "" : String(value));
    } catch {
      process.stdout.write("");
    }
  ' "$1" "$2"
}

# ── Locking ─────────────────────────────────────────────────────────────────
# mkdir is atomic on every filesystem we care about; macOS has no flock.

acquire_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    echo "$$" > "$LOCK_DIR/pid"
    trap 'rm -rf "$LOCK_DIR"' EXIT
    return 0
  fi

  local holder
  holder="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
  if [[ -n "$holder" ]] && ! kill -0 "$holder" 2>/dev/null; then
    log "clearing stale lock (pid $holder is gone)"
    rm -rf "$LOCK_DIR"
    if mkdir "$LOCK_DIR" 2>/dev/null; then
      echo "$$" > "$LOCK_DIR/pid"
      trap 'rm -rf "$LOCK_DIR"' EXIT
      return 0
    fi
  fi
  return 1
}

# ── Events ──────────────────────────────────────────────────────────────────
# One JSONL line per event under the run directory; run-level events also go to
# the cross-run loop log. Emission is best effort and never fails the loop.

RUN_ID=""
RUN_DIR=""

init_run() {
  RUN_ID="$1"
  RUN_DIR="$RUNS_DIR/$RUN_ID"
  mkdir -p "$RUN_DIR"
  printf '0' > "$SEQ_DIR/$RUN_ID"
}

_next_seq() {
  local file="$SEQ_DIR/${RUN_ID:-unknown}" n
  n="$(cat "$file" 2>/dev/null || echo 0)"
  n=$((n + 1))
  printf '%s' "$n" > "$file" 2>/dev/null || true
  printf '%s' "$n"
}

_is_run_level() {
  case "$1" in run.start | feature.selected | validation | pr.opened | run.end) return 0 ;; *) return 1 ;; esac
}

# emit_event TYPE [key=value ...]
# Values are passed to jq as arguments, never interpolated into a filter, so an
# agent-controlled string cannot inject JSON or shell.
emit_event() {
  local type="$1"
  shift || true

  local -a args=(--arg ts "$(date +%Y-%m-%dT%H:%M:%S)" --arg run_id "${RUN_ID:-unknown}" --arg type "$type" --argjson seq "$(_next_seq)")
  local filter='{ts:$ts,run_id:$run_id,seq:$seq,type:$type}'

  local pair key value
  for pair in "$@"; do
    key="${pair%%=*}"
    value="${pair#*=}"
    case "$key" in
      count | cap | additions | deletions | commits | number | files | duration_ms | blockers)
        args+=(--argjson "$key" "$value")
        ;;
      *)
        args+=(--arg "$key" "$value")
        ;;
    esac
    filter="$filter + {$key:\$$key}"
  done

  local line
  line="$(jq -nc "${args[@]}" "$filter" 2>/dev/null)" || return 0
  [[ -n "$line" && -n "$RUN_DIR" ]] && printf '%s\n' "$line" >> "$RUN_DIR/events.jsonl"
  _is_run_level "$type" && printf '%s\n' "$line" >> "$LOOP_LOG"

  log "$type $*"
  return 0
}
