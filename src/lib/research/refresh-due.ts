import { FRESHNESS_THRESHOLDS_DAYS } from './freshness';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * When a run's findings stop counting as fresh, which is the same moment
 * `selectResearchSchedule` stops skipping the company. Derived from the shared
 * threshold rather than a second constant, so the page cannot promise a
 * refresh the scheduler will not perform.
 *
 * The fresh band is inclusive (`freshnessOf` returns fresh while whole days
 * elapsed are `<= fresh`), so the first non-fresh day is the one after the
 * threshold. An eval asserts the two agree across a range of ages rather than
 * trusting this comment.
 *
 * Null when the observation time cannot be read: an unreadable date is not a
 * due date.
 */
export function refreshDueAt(observedAt: string): Date | null {
  const observed = new Date(observedAt);
  if (Number.isNaN(observed.getTime())) return null;

  return new Date(
    observed.getTime() + (FRESHNESS_THRESHOLDS_DAYS.fresh + 1) * MS_PER_DAY,
  );
}

/**
 * Whole days until a refresh is due; negative once it is overdue. `now` is an
 * argument, because a countdown that reads its own clock cannot be evaluated.
 */
export function daysUntilRefresh(observedAt: string, now: Date): number | null {
  const due = refreshDueAt(observedAt);
  if (!due) return null;

  return Math.ceil((due.getTime() - now.getTime()) / MS_PER_DAY);
}

const days = (count: number): string => `${count} day${count === 1 ? '' : 's'}`;

/** Closed copy. Unknown is its own case, never a countdown from a bad date. */
export function refreshDueCopy(observedAt: string, now: Date): string {
  const remaining = daysUntilRefresh(observedAt, now);
  if (remaining === null) return 'Refresh timing unknown';
  if (remaining > 0) return `Refresh due in ${days(remaining)}`;
  if (remaining === 0) return 'Refresh due now';
  return `Refresh overdue by ${days(-remaining)}`;
}

/** The due date as a machine-readable attribute, or null when unknown. */
export function refreshDueDateTime(observedAt: string): string | null {
  return refreshDueAt(observedAt)?.toISOString() ?? null;
}
