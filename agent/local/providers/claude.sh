#!/usr/bin/env bash
# Claude Code adapter. Source this; do not execute it.
#
# Contract: provider_run <prompt_file> <workdir> <stream_out>
#
# Claude Code takes the prompt on stdin rather than from a file, and its
# stream-json output format requires --verbose. Those differences are the whole
# reason this adapter layer exists.

provider_available() { command -v claude >/dev/null 2>&1; }

provider_run() {
  local prompt_file="$1" workdir="$2" stream_out="$3"

  (
    cd "$workdir" || exit 1
    claude \
      --print \
      --model "$AGENT_MODEL" \
      --permission-mode bypassPermissions \
      --output-format stream-json \
      --verbose \
      --max-turns "$AGENT_MAX_TURNS" \
      < "$prompt_file"
  ) > "$stream_out" 2>&1
}
