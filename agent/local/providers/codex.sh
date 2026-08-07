#!/usr/bin/env bash
# Codex adapter. Source this; do not execute it.
#
# Contract: provider_run <prompt_file> <workdir> <stream_out>
#
# Codex runs headlessly through `exec`, takes the prompt on stdin, and needs
# --skip-git-repo-check because the worktree is not the repository root.

provider_available() { command -v codex >/dev/null 2>&1; }

provider_run() {
  local prompt_file="$1" workdir="$2" stream_out="$3"

  codex exec \
    --skip-git-repo-check \
    --cd "$workdir" \
    --model "$AGENT_MODEL" \
    --sandbox workspace-write \
    --ephemeral \
    --json \
    < "$prompt_file" > "$stream_out" 2>&1
}
