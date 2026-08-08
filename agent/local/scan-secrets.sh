#!/usr/bin/env bash
# Scans the added lines of a diff for credential-shaped values.
#
# The same guard the continuation loop runs before pushing, reused here so CI
# and the harness share one definition of what a secret looks like. Deliberately
# only the secret guard: the path and diff-size guards constrain autonomous
# changes, not human ones.
#
# Usage: scan-secrets.sh [base_ref]
set -euo pipefail

_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "$_DIR/lib.sh"
# shellcheck source=guards.sh
source "$_DIR/guards.sh"
load_config

base="${1:-origin/$BASE_BRANCH}"

if guard_secret_scan "$REPO_ROOT" "$base"; then
  log "secret scan clean against $base"
else
  log "secret scan FAILED against $base"
  exit 1
fi
