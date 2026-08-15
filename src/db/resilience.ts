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
