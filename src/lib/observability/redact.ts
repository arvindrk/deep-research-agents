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
    // The shell guard has refused this shape since the guards landed; this
    // list did not, so a key pasted into the search box was logged as a
    // sixty-four character prefix: the header and the first bytes of the key.
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  ];
}

export function redactCredentials(text: string): string {
  return credentialPatterns().reduce(
    (scrubbed, pattern) => scrubbed.replace(pattern, REDACTED),
    text,
  );
}

/** Reader text is logged as a bounded prefix, never whole. */
export const MAX_LOGGED_QUERY_CHARS = 64;

/**
 * Scrub before truncating: a secret cut in half by the length bound is still
 * half a secret in the log. Both halves of that rule live here, so the next
 * logger reaches for one thing rather than remembering two.
 */
export function boundQueryText(query: string): {
  query_prefix: string;
  query_chars: number;
} {
  const trimmed = query.trim();
  const scrubbed = redactCredentials(trimmed);

  return {
    query_prefix: scrubbed.slice(0, MAX_LOGGED_QUERY_CHARS),
    query_chars: trimmed.length,
  };
}
