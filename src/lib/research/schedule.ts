import { freshnessOf } from './freshness';

/** One company and the observation time of its newest finding, if any. */
export type CompanyFreshnessRow = {
  company_id: string;
  newest_finding_at: string | null;
};

export type ScheduleSkipReason = 'fresh' | 'over_cap';

export type ScheduleSkip = {
  company_id: string;
  reason: ScheduleSkipReason;
};

export type ScheduleResult = {
  selected: string[];
  skipped: ScheduleSkip[];
};

type Ranked = {
  company_id: string;
  /** Lower sorts first: missing, unknown, stale (oldest), aging (oldest). */
  tier: number;
  /** Milliseconds for oldest-first within a tier; 0 when missing/unknown. */
  observedMs: number;
};

/**
 * Pick who to research this cadence. Missing findings first, then the oldest
 * stale, then aging. Fresh companies are skipped with an explicit reason; the
 * rest that do not fit under `limit` are skipped as over_cap.
 *
 * `now` is injected so the choice is hermetic.
 */
export function selectResearchSchedule(
  companies: CompanyFreshnessRow[],
  now: Date,
  limit: number,
): ScheduleResult {
  const cap = Math.max(0, Math.floor(limit));
  const ranked: Ranked[] = [];
  const skipped: ScheduleSkip[] = [];

  for (const row of companies) {
    if (row.newest_finding_at === null) {
      ranked.push({ company_id: row.company_id, tier: 0, observedMs: 0 });
      continue;
    }

    const band = freshnessOf(row.newest_finding_at, now);
    if (band === 'fresh') {
      skipped.push({ company_id: row.company_id, reason: 'fresh' });
      continue;
    }

    const observed = new Date(row.newest_finding_at);
    const observedMs = Number.isNaN(observed.getTime()) ? 0 : observed.getTime();

    if (band === 'unknown') {
      ranked.push({ company_id: row.company_id, tier: 1, observedMs });
      continue;
    }
    if (band === 'stale') {
      ranked.push({ company_id: row.company_id, tier: 2, observedMs });
      continue;
    }
    // aging
    ranked.push({ company_id: row.company_id, tier: 3, observedMs });
  }

  ranked.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.observedMs !== b.observedMs) return a.observedMs - b.observedMs;
    return a.company_id < b.company_id ? -1 : a.company_id > b.company_id ? 1 : 0;
  });

  const selected = ranked.slice(0, cap).map((row) => row.company_id);
  for (const row of ranked.slice(cap)) {
    skipped.push({ company_id: row.company_id, reason: 'over_cap' });
  }

  return { selected, skipped };
}
