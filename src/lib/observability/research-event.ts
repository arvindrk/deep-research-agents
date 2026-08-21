import type { ResearchRunStatus } from '@/lib/research/run';
import type { ScheduleSkipReason } from '@/lib/research/schedule';
import type { ResearchSourceId } from '@/lib/research/types';

import { latencyBucket } from './search-event';

/** Every terminal status of a research run, matching ResearchRunStatus. */
export const RESEARCH_RUN_STATUSES = [
  'complete',
  'partial',
  'failed',
] as const satisfies readonly ResearchRunStatus[];

/** Skip reasons from selectResearchSchedule; keys on the schedule event. */
export const SCHEDULE_SKIP_REASONS = [
  'fresh',
  'over_cap',
] as const satisfies readonly ScheduleSkipReason[];

export type ResearchRunEventInput = {
  status: ResearchRunStatus;
  companyId: string;
  attempted: readonly ResearchSourceId[];
  succeeded: readonly ResearchSourceId[];
  /** Source ids only; never Error stacks or finding payloads. */
  failed: readonly ResearchSourceId[];
  findingsCount: number;
  durationMs: number;
};

/**
 * Wire shape for one company research pass. Every field is always present so
 * log queries do not branch on status.
 */
export type ResearchRunEvent = {
  event: 'research.run';
  status: ResearchRunStatus;
  company_id: string;
  sources_attempted: ResearchSourceId[];
  sources_succeeded: ResearchSourceId[];
  sources_failed: ResearchSourceId[];
  findings_count: number;
  duration_ms: number;
  latency_bucket: string;
};

export type ResearchScheduleEventInput = {
  selectedCount: number;
  skipCounts: Record<ScheduleSkipReason, number>;
};

/**
 * One summary per script pass: how many ran vs why the rest were skipped.
 * Counts only; never a list of skipped company ids.
 */
export type ResearchScheduleEvent = {
  event: 'research.schedule';
  selected_count: number;
  skip_counts: Record<ScheduleSkipReason, number>;
};

export type ResearchEvent = ResearchRunEvent | ResearchScheduleEvent;

export function buildResearchRunEvent(
  input: ResearchRunEventInput,
): ResearchRunEvent {
  return {
    event: 'research.run',
    status: input.status,
    company_id: input.companyId,
    sources_attempted: [...input.attempted],
    sources_succeeded: [...input.succeeded],
    sources_failed: [...input.failed],
    findings_count: input.findingsCount,
    duration_ms: input.durationMs,
    latency_bucket: latencyBucket(input.durationMs),
  };
}

export function buildResearchScheduleEvent(
  input: ResearchScheduleEventInput,
): ResearchScheduleEvent {
  const skip_counts = {} as Record<ScheduleSkipReason, number>;
  for (const reason of SCHEDULE_SKIP_REASONS) {
    skip_counts[reason] = input.skipCounts[reason] ?? 0;
  }

  return {
    event: 'research.schedule',
    selected_count: input.selectedCount,
    skip_counts,
  };
}
