import {
  freshnessOf,
  relativeAge,
  type Freshness,
} from './freshness';

/**
 * Closed map shared with CompanyEvidence wording so profile sync and research
 * findings speak the same freshness language.
 */
export const SYNC_FRESHNESS_LABEL = {
  fresh: 'Fresh',
  aging: 'Aging',
  stale: 'Stale',
  unknown: 'Age unknown',
} as const satisfies Record<Freshness, string>;

export type SyncFreshnessLabel =
  (typeof SYNC_FRESHNESS_LABEL)[keyof typeof SYNC_FRESHNESS_LABEL];

/** ISO string when the timestamp parses; null when it does not. */
export function syncDateTime(lastSyncedAt: Date | string): string | null {
  const date =
    lastSyncedAt instanceof Date ? lastSyncedAt : new Date(lastSyncedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Band for a company profile sync timestamp. Accepts Date or string because
 * Neon may hand either shape through to the Server Component.
 */
export function syncFreshnessOf(
  lastSyncedAt: Date | string,
  now: Date,
): Freshness {
  const iso = syncDateTime(lastSyncedAt);
  if (iso === null) return 'unknown';
  return freshnessOf(iso, now);
}

export function syncRelativeAge(
  lastSyncedAt: Date | string,
  now: Date,
): string {
  const iso = syncDateTime(lastSyncedAt);
  if (iso === null) return relativeAge('', now);
  return relativeAge(iso, now);
}

export function syncFreshnessLabel(
  lastSyncedAt: Date | string,
  now: Date,
): SyncFreshnessLabel {
  return SYNC_FRESHNESS_LABEL[syncFreshnessOf(lastSyncedAt, now)];
}
