#!/usr/bin/env bash
# One poll of the base branch. Starts a continuation when the tip has moved.
#
# Usage: merge-watch.sh [--dry-run]
set -euo pipefail

_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$_DIR/lib.sh"
load_config

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

remote_sha="$(git -C "$REPO_ROOT" ls-remote origin "refs/heads/$BASE_BRANCH" 2>/dev/null | awk '{print $1}')"
if [[ -z "$remote_sha" ]]; then
  log "could not read origin/$BASE_BRANCH; skipping this tick"
  exit 0
fi

last_sha="$(cat "$STATE_DIR/last-merge-sha" 2>/dev/null || true)"
if [[ "$remote_sha" == "$last_sha" ]]; then
  log "no change (${remote_sha:0:8})"
  exit 0
fi

git -C "$REPO_ROOT" fetch --quiet origin "$BASE_BRANCH" || true
message="$(git -C "$REPO_ROOT" log -1 --format=%B "$remote_sha" 2>/dev/null || true)"

if grep -qiE '\[skip (harness|agent|continuation)\]' <<<"$message"; then
  log "skip marker on ${remote_sha:0:8}; recording without continuing"
  [[ "$DRY_RUN" -eq 0 ]] && printf '%s' "$remote_sha" > "$STATE_DIR/last-merge-sha"
  exit 0
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
  log "[dry-run] would continue from ${remote_sha:0:8} (last recorded: ${last_sha:-none})"
  exit 0
fi

if ! acquire_lock; then
  log "a continuation is already running; skipping this tick"
  exit 0
fi

run_log="$LOG_DIR/continue-$(date +%Y%m%d-%H%M%S).log"
log "new merge ${remote_sha:0:8}; starting continuation (log: $run_log)"

# The SHA is recorded only on success, so a failed run retries on the next tick
# rather than being silently skipped forever.
if "$_DIR/continue.sh" "$remote_sha" >>"$run_log" 2>&1; then
  printf '%s' "$remote_sha" > "$STATE_DIR/last-merge-sha"
  log "continuation finished for ${remote_sha:0:8}"
else
  log "continuation FAILED (exit $?) for ${remote_sha:0:8}; will retry. See $run_log"
fi
