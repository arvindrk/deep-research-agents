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
