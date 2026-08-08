#!/usr/bin/env bash
# Prints the context an agent needs before choosing or implementing work.
# Read-only: this script never writes to the repository.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

echo "== $(basename "$root") =="
git status --short --branch

echo
echo "== recent commits =="
git log --oneline -5

echo
echo "== open work =="
node -e '
  const features = require("./agent/feature_list.json");
  const done = new Set(features.filter((f) => f.status === "completed").map((f) => f.id));
  const open = features.filter((f) => f.status !== "completed");
  for (const f of open) {
    const blockers = (f.depends_on || []).filter((d) => !done.has(d));
    const state = blockers.length ? `blocked by ${blockers.join(", ")}` : "unblocked";
    console.log(`  [${f.priority}] ${f.id} (${f.status}, ${f.category}) — ${state}`);
  }
  console.log(`  ${done.size} completed, ${open.length} open`);
'

echo
echo "== horizon =="
node -e 'console.log("  " + require("./agent/harness/horizon.json").slice.join(" -> "))'

echo
echo "== progress tail =="
tail -30 agent/PROGRESS.md

echo
echo "== verification =="
echo "  npm run verify"
