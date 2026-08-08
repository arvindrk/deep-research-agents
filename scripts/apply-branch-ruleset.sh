#!/usr/bin/env bash
# Applies .github/rulesets/main.json to the repository.
#
# Not run automatically. Turning this on means every change to the default
# branch goes through a pull request with green checks, including yours, so it
# is a decision rather than a default.
#
#   bash scripts/apply-branch-ruleset.sh            # show what would change
#   bash scripts/apply-branch-ruleset.sh --apply    # create or update it
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
config="$root/.github/rulesets/main.json"
repo="$(node -p "require('$root/agent/harness-config.json').gh_repo")"
name="$(node -p "require('$config').name")"

existing="$(gh api "repos/$repo/rulesets" --jq ".[] | select(.name == \"$name\") | .id" 2>/dev/null || true)"

if [[ "${1:-}" != "--apply" ]]; then
  echo "Repository: $repo"
  echo "Ruleset:    $name ${existing:+(already exists, id $existing)}"
  echo
  cat "$config"
  echo
  echo "Nothing applied. Re-run with --apply to ${existing:+update}${existing:-create} it."
  echo "Note: this blocks direct pushes to the default branch for everyone, including you."
  exit 0
fi

if [[ -n "$existing" ]]; then
  gh api -X PUT "repos/$repo/rulesets/$existing" --input "$config" >/dev/null
  echo "Updated ruleset '$name' (id $existing) on $repo."
else
  gh api -X POST "repos/$repo/rulesets" --input "$config" >/dev/null
  echo "Created ruleset '$name' on $repo."
fi
