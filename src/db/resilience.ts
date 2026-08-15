/**
 * Transient failures over the Neon HTTP driver look like network faults or a
 * connection the platform recycled. Retrying those is worth it; retrying a
 * syntax error or a constraint violation is not, so classification is by
 * message shape and deliberately narrow.
 */
const TRANSIENT_ERROR_PATTERNS = [
  /fetch failed/i,
  /econnreset/i,
  /etimedout/i,
  /socket hang up/i,
  /connection (terminated|closed|reset)/i,
  /server closed the connection/i,
  /too many connections/i,
  /the database system is (starting up|shutting down)/i,
];

export function isTransientDatabaseError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

/** Attempts include the first try, so 3 allows at most two retries. */
export const RETRY_ATTEMPTS = 3;
export const RETRY_BASE_DELAY_MS = 50;
export const RETRY_MAX_DELAY_MS = 500;

/**
 * Exponential backoff with jitter, where the jitter is an argument. A schedule
 * that reads its own random source cannot be locked by an eval, and unjittered
 * retries from many instances arrive in the same millisecond.
 *
 * `jitter` is in [0, 1). The delay lands in [ceiling / 2, ceiling).
 */
export function backoffDelayMs(attempt: number, jitter: number): number {
  if (!Number.isInteger(attempt) || attempt < 1) {
    throw new Error('attempt must be an integer >= 1');
  }
  if (!(jitter >= 0 && jitter < 1)) {
    throw new Error('jitter must be in [0, 1)');
  }

  const ceiling = Math.min(
    RETRY_BASE_DELAY_MS * 2 ** (attempt - 1),
    RETRY_MAX_DELAY_MS,
  );
  return Math.round(ceiling * (0.5 + 0.5 * jitter));
}

export type RetryOptions = {
  attempts?: number;
  sleep?: (ms: number) => Promise<void>;
  jitter?: () => number;
};

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `operation`, retrying only transient failures. Sleep and jitter are
 * injectable so the loop is evaluable without a clock or a random source.
 * A permanent failure is rethrown on the first attempt, unchanged.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const attempts = options.attempts ?? RETRY_ATTEMPTS;
  const sleep = options.sleep ?? defaultSleep;
  const jitter = options.jitter ?? Math.random;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= attempts || !isTransientDatabaseError(error)) {
        throw error;
      }
      await sleep(backoffDelayMs(attempt, jitter()));
    }
  }
}
