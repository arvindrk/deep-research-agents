# Evals

Evals are how an autonomous change proves it did not break anything. They are the only reason it is safe to open a pull request without a human having read the diff first.

## Shape

- One file per unit under `src/eval/`, named `<subject>.eval.ts`. Discovery is by glob; there is no list to register in.
- Written with `node:test` and `node:assert/strict`. No test framework dependency.
- Run with `npm run eval`, which is part of `npm run verify` and of CI.

## Hermetic

An eval must produce the same result on any machine, offline, at any time. That means no network, no database, no clock, no randomness, no environment variables, and no React rendering.

Reading files from the repository is allowed, and is how the manifest and schema evals work.

If a unit cannot be tested hermetically, that is a signal the logic should be extracted into a pure module and the I/O kept at the edge. Do that rather than reaching for a mock.

## Assert against production code

Import the real module. An eval that reimplements the logic it is checking proves nothing.

## Lock after ship

When a change ships behaviour worth keeping, the next change locks it with an eval. Prefer asserting invariants over a range of inputs to asserting three hand-picked examples.

## Prove it fails

A validator nobody has seen fail is not a validator. When you add an eval, break the code it covers, confirm the eval goes red, restore it, and record that in the pull request.
