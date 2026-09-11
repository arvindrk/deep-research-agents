import { FRESHNESS_THRESHOLDS_DAYS } from './freshness';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * When a run's findings stop counting as fresh, which is the same moment
 * `selectResearchSchedule` stops skipping the company. Derived from the shared
 * threshold rather than a second constant, so the page cannot promise a
 * refresh the scheduler will not perform.
 *
 * Null when the observation time cannot be read: an unreadable date is not a
 * due date.
 */
export function refreshDueAt(observedAt: string): Date | null {
  const observed = new Date(observedAt);
  if (Number.isNaN(observed.getTime())) return null;

  return new Date(
    observed.getTime() + FRESHNESS_THRESHOLDS_DAYS.fresh * MS_PER_DAY,
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
