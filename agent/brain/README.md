# Agent brain

Machine-local, generated state for the continuation loop. Everything here except this file is git-ignored.

- `state/` — the last observed merge SHA and other loop bookkeeping
- `locks/` — the continuation lock, so two runs cannot write at once
- `logs/` — per-run event streams (`logs/runs/<id>/events.jsonl`) and the cross-run `loop.jsonl`
- `run/` — prompts and artifacts assembled for the current run

Never store secrets, `.env` contents, tokens, cookies, or anything from a personal or work knowledge base here. Event logs end up in pull request bodies and terminal output.
