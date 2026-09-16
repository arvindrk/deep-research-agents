/**
 * Keep a credential out of a log. Reader text reaches this repository through a
 * search box and through route parameters, and anyone can paste anything into
 * either, so the scrub happens before anything is written rather than being
 * trusted not to be needed.
 *
 * Value-shaped, never name-shaped, for the reason `agent/local/guards.sh`
 * records next to the same set: a rule that matched `sk-` on its own would
 * flag the file that describes the rule. An eval reads that script and fails
 * when the two lists diverge.
 */
export const REDACTED = '[redacted]';

/**
 * Built per call. A global-flagged regex carries `lastIndex` between uses, and
 * a shared array would give a caller reaching for `.test()` alternating
 * answers on the same input.
 */
function credentialPatterns(): RegExp[] {
  return [
    /postgres(ql)?:\/\/\S{12,}/gi,
    /gh[pousr]_[A-Za-z0-9]{30,}/g,
    /sk-[A-Za-z0-9_-]{20,}/g,
    /AKIA[0-9A-Z]{16}/g,
    /xox[baprs]-[A-Za-z0-9-]{10,}/g,
  ];
}

export function redactCredentials(text: string): string {
  return credentialPatterns().reduce(
    (scrubbed, pattern) => scrubbed.replace(pattern, REDACTED),
    text,
  );
}
