#!/usr/bin/env bash
# Grok adapter. Source this; do not execute it.
#
# Contract: provider_run <prompt_file> <workdir> <stream_out>
#   Runs one headless, single-turn agent invocation with <workdir> as cwd,
#   streams its transcript to <stream_out>, and returns the agent's exit code.

provider_available() { command -v grok >/dev/null 2>&1; }

provider_run() {
  local prompt_file="$1" workdir="$2" stream_out="$3"

  (
    cd "$workdir" || exit 1
    grok \
      --prompt-file "$prompt_file" \
      -m "$AGENT_MODEL" \
      --permission-mode bypassPermissions \
      --output-format streaming-json \
      --max-turns "$AGENT_MAX_TURNS"
  ) > "$stream_out" 2>&1
}
