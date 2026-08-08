#!/usr/bin/env bash
# Foreground merge watcher. Run it in a terminal; Ctrl-C stops it.
#
# There is no daemon and nothing survives this process. That is the kill switch:
# when this window is closed, the repository is not autonomous.
set -euo pipefail

_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$_DIR/lib.sh"
load_config

trap 'log "watcher stopped"; exit 0' INT TERM

log "watching origin/$BASE_BRANCH every ${WATCH_INTERVAL}s"
log "repo:     $REPO_ROOT ($REPO_GH)"
log "provider: $AGENT_CMD $AGENT_MODEL"
log "Ctrl-C to stop"

while true; do
  "$_DIR/merge-watch.sh" || log "merge-watch exited non-zero; continuing"
  sleep "$WATCH_INTERVAL"
done
