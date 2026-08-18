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

/**
 * Product thresholds in days. A reader needs to know whether a claim is worth
 * trusting today, and the answer is a band rather than a number.
 */
export const FRESHNESS_THRESHOLDS_DAYS = {
  fresh: 7,
  aging: 30,
} as const;

export type Freshness = 'fresh' | 'aging' | 'stale' | 'unknown';

export function freshnessOf(observedAt: string, now: Date): Freshness {
  const age = ageInDays(observedAt, now);
  if (age === null) return 'unknown';
  if (age <= FRESHNESS_THRESHOLDS_DAYS.fresh) return 'fresh';
  if (age <= FRESHNESS_THRESHOLDS_DAYS.aging) return 'aging';
  return 'stale';
}

const ago = (count: number, unit: string): string =>
  `${count} ${unit}${count === 1 ? '' : 's'} ago`;

/**
 * How old a finding is, in words. Coarse on purpose past a week: "3 weeks ago"
 * is what a reader can act on, and pretending to more precision than the
 * collection schedule has would be a lie.
 */
export function relativeAge(observedAt: string, now: Date): string {
  const age = ageInDays(observedAt, now);
  if (age === null) return 'date unknown';
  if (age === 0) return 'today';
  if (age === 1) return 'yesterday';
  if (age < 7) return ago(age, 'day');
  if (age < 30) return ago(Math.floor(age / 7), 'week');
  if (age < 365) return ago(Math.floor(age / 30), 'month');
  return ago(Math.floor(age / 365), 'year');
}
