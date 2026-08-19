/** Every terminal outcome of a search request, in the order the route hits them. */
export const SEARCH_OUTCOMES = [
  'ok',
  'invalid_request',
  'embed_unavailable',
  'search_failed',
] as const;

export type SearchOutcome = (typeof SEARCH_OUTCOMES)[number];

/**
 * Upper bounds in milliseconds. Buckets keep dashboards comparable across
 * deploys, which raw durations do not.
 */
export const LATENCY_BUCKETS_MS = [50, 100, 250, 500, 1000, 2500] as const;

const SLOWEST_BUCKET = LATENCY_BUCKETS_MS[LATENCY_BUCKETS_MS.length - 1];

export function latencyBucket(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return 'unknown';
  }
  for (const bound of LATENCY_BUCKETS_MS) {
    if (durationMs <= bound) {
      return `<=${bound}ms`;
    }
  }
  return `>${SLOWEST_BUCKET}ms`;
}

/** Search queries are user text. Log a bounded prefix, never the whole thing. */
export const MAX_LOGGED_QUERY_CHARS = 64;

/** Value-shaped credential patterns, mirroring `agent/local/guards.sh`. */
const CREDENTIAL_PATTERNS = [
  /postgres(ql)?:\/\/\S{12,}/gi,
  /gh[pousr]_[A-Za-z0-9]{30,}/g,
  /sk-[A-Za-z0-9_-]{20,}/g,
  /AKIA[0-9A-Z]{16}/g,
  /xox[baprs]-[A-Za-z0-9-]{10,}/g,
];

const REDACTED = '[redacted]';

/**
 * Scrub before truncating: a secret cut in half by the length bound is still
 * half a secret in the log.
 */
export function boundQueryText(query: string): {
  query_prefix: string;
  query_chars: number;
} {
  const trimmed = query.trim();
  const scrubbed = CREDENTIAL_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, REDACTED),
    trimmed,
  );

  return {
    query_prefix: scrubbed.slice(0, MAX_LOGGED_QUERY_CHARS),
    query_chars: trimmed.length,
  };
}

/** What the route knows by the time a request ends, one way or another. */
export type SearchEventInput = {
  outcome: SearchOutcome;
  durationMs: number;
  embedMs?: number;
  queryMs?: number;
  resultCount?: number;
  query?: string;
};

/**
 * The wire shape. Every field is always present: a log query that has to know
 * which keys exist for which outcome is a log query nobody writes.
 */
export type SearchEvent = {
  event: 'search.request';
  outcome: SearchOutcome;
  duration_ms: number;
  latency_bucket: string;
  embed_ms: number;
  query_ms: number;
  result_count: number;
  query_prefix: string;
  query_chars: number;
};

export function buildSearchEvent(input: SearchEventInput): SearchEvent {
  const { query_prefix, query_chars } = boundQueryText(input.query ?? '');

  return {
    event: 'search.request',
    outcome: input.outcome,
    duration_ms: input.durationMs,
    latency_bucket: latencyBucket(input.durationMs),
    embed_ms: input.embedMs ?? 0,
    query_ms: input.queryMs ?? 0,
    result_count: input.resultCount ?? 0,
    query_prefix,
    query_chars,
  };
}
