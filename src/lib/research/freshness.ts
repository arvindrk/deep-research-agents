const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whole days between an observation and now. Null when the timestamp cannot be
 * read: an unreadable date is not the same as a fresh one.
 *
 * `now` is an argument. Freshness that reads its own clock cannot be evaluated.
 */
export function ageInDays(observedAt: string, now: Date): number | null {
  const observed = new Date(observedAt);
  if (Number.isNaN(observed.getTime())) {
    return null;
  }

  const elapsed = now.getTime() - observed.getTime();
  return elapsed < 0 ? 0 : Math.floor(elapsed / MS_PER_DAY);
}
