#!/usr/bin/env bash
# Deterministic pre-push guards. Source this; do not execute it.
#
# The Validator is a model and can be argued with. These are not: they are
# mechanical checks on the diff that runs last, after the Validator passes and
# before anything is pushed. Every function returns non-zero to block the run.

# Paths an autonomous change may never touch, whatever the plan says.
GUARD_FORBIDDEN_PATTERNS=(
  '^\.env'
  '/\.env'
  '^\.git/'
  '^node_modules/'
  '^\.harness/'
  '^agent/brain/'
  '^\.github/workflows/'
)

# Value-shaped, not name-shaped. Matching on "sk-" or "postgres://" alone would
# flag this file and the evals that describe these patterns; requiring a
# plausible payload does not.
GUARD_SECRET_PATTERNS=(
  'postgres(ql)?://[^[:space:]"'"'"']{12,}'
  'gh[pousr]_[A-Za-z0-9]{30,}'
  'sk-[A-Za-z0-9_-]{20,}'
  'AKIA[0-9A-Z]{16}'
  'xox[baprs]-[A-Za-z0-9-]{10,}'
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
)

_changed_files() { git -C "$1" diff --name-only "$2...HEAD"; }

# guard_forbidden_paths <worktree> <base_ref>
guard_forbidden_paths() {
  local worktree="$1" base="$2" file pattern violations=0

  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    for pattern in "${GUARD_FORBIDDEN_PATTERNS[@]}"; do
      if printf '%s' "$file" | grep -qE -e "$pattern"; then
        log "guard: forbidden path in diff: $file (matched $pattern)"
        violations=$((violations + 1))
      fi
    done
  done < <(_changed_files "$worktree" "$base")

  [[ "$violations" -eq 0 ]]
}

# guard_diff_caps <worktree> <base_ref>
# A runaway agent shows up as an enormous diff long before it shows up as a
# wrong one, so size is the cheapest signal available.
guard_diff_caps() {
  local worktree="$1" base="$2" files lines

  files="$(_changed_files "$worktree" "$base" | grep -c . || true)"
  lines="$(git -C "$worktree" diff --numstat "$base...HEAD" | awk '{a+=$1; d+=$2} END {print a+d+0}')"

  if [[ "$files" -gt "$MAX_FILES_CHANGED" ]]; then
    log "guard: $files files changed, cap is $MAX_FILES_CHANGED"
    return 1
  fi
  if [[ "$lines" -gt "$MAX_LINES_CHANGED" ]]; then
    log "guard: $lines lines changed, cap is $MAX_LINES_CHANGED"
    return 1
  fi

  log "guard: diff within caps ($files files, $lines lines)"
}

# guard_secret_scan <worktree> <base_ref>
# Added lines only. Removing a leaked secret must not be blocked by the guard
# that exists to stop it being added.
guard_secret_scan() {
  local worktree="$1" base="$2" pattern added violations=0

  added="$(git -C "$worktree" diff "$base...HEAD" | grep '^+' | grep -v '^+++' || true)"

  for pattern in "${GUARD_SECRET_PATTERNS[@]}"; do
    if printf '%s' "$added" | grep -qE -e "$pattern"; then
      # Never log the match itself; it would land in the terminal and the logs.
      log "guard: added line matches a credential pattern (${pattern:0:24}...)"
      violations=$((violations + 1))
    fi
  done

  [[ "$violations" -eq 0 ]]
}

# guard_secret_text <file>
# Same scan for text about to be published, such as a pull request body.
guard_secret_text() {
  local file="$1" pattern
  [[ -f "$file" ]] || return 0

  for pattern in "${GUARD_SECRET_PATTERNS[@]}"; do
    if grep -qE -e "$pattern" "$file"; then
      log "guard: text destined for publication matches a credential pattern"
      return 1
    fi
  done
}

# guard_dependency_change <worktree> <base_ref>
# A lockfile moving on its own is either an accident or an unreviewed upgrade.
guard_dependency_change() {
  local worktree="$1" base="$2" changed lock_changed=0 manifest_changed=0

  changed="$(_changed_files "$worktree" "$base")"
  printf '%s\n' "$changed" | grep -qE '(^|/)package-lock\.json$' && lock_changed=1
  printf '%s\n' "$changed" | grep -qE '(^|/)package\.json$' && manifest_changed=1

  if [[ "$lock_changed" -eq 1 && "$manifest_changed" -eq 0 ]]; then
    log "guard: package-lock.json changed without package.json"
    return 1
  fi
}

# run_guards <worktree> <base_ref>: every guard runs, so one report lists them all.
run_guards() {
  local worktree="$1" base="$2" failed=0

  guard_forbidden_paths "$worktree" "$base" || failed=$((failed + 1))
  guard_diff_caps "$worktree" "$base" || failed=$((failed + 1))
  guard_secret_scan "$worktree" "$base" || failed=$((failed + 1))
  guard_dependency_change "$worktree" "$base" || failed=$((failed + 1))

  if [[ "$failed" -gt 0 ]]; then
    log "guards: $failed check(s) failed; refusing to push"
    return 1
  fi
  log "guards: all checks passed"
}
