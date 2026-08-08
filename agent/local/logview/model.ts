import { field, numeric, type HarnessEvent } from './events';

export type RunStatus = 'running' | 'completed' | 'failed' | 'skipped' | 'no-changes';

export type RunSummary = {
  runId: string;
  startedAt: string;
  endedAt: string;
  status: RunStatus;
  reason: string;
  durationMs: number;
  branch: string;
  provider: string;
  featureId: string;
  title: string;
  verdict: string;
  blockers: number;
  prUrl: string;
  files: number;
  additions: number;
  deletions: number;
  commits: number;
};

const KNOWN_STATUSES: RunStatus[] = ['completed', 'failed', 'skipped', 'no-changes'];

const elapsedMs = (from: string, to: string): number => {
  const start = Date.parse(from);
  const end = Date.parse(to);
  return Number.isNaN(start) || Number.isNaN(end) ? 0 : Math.max(end - start, 0);
};

/** Folds one run's events into the shape a reader actually wants. */
export function summariseRun(events: HarnessEvent[]): RunSummary {
  const first = (type: string) => events.find((event) => event.type === type);

  const start = first('run.start');
  const end = first('run.end');
  const feature = first('feature.selected');
  const validation = first('validation');
  const pr = first('pr.opened');
  const changes = first('impl.changes');

  const declared = field(end, 'status') as RunStatus;
  const status: RunStatus = KNOWN_STATUSES.includes(declared) ? declared : 'running';

  const startedAt = start?.ts ?? events[0]?.ts ?? '';
  const endedAt = end?.ts ?? '';
  const declaredDuration = numeric(end, 'duration_ms');

  return {
    runId: events[0]?.run_id ?? '',
    startedAt,
    endedAt,
    status,
    reason: field(end, 'reason'),
    durationMs: declaredDuration || (endedAt ? elapsedMs(startedAt, endedAt) : 0),
    branch: field(start, 'branch'),
    provider: field(start, 'provider'),
    featureId: field(feature, 'feature_id'),
    title: field(feature, 'title'),
    verdict: field(validation, 'verdict'),
    blockers: numeric(validation, 'blockers'),
    prUrl: field(pr, 'url'),
    files: numeric(changes, 'files'),
    additions: numeric(changes, 'additions'),
    deletions: numeric(changes, 'deletions'),
    commits: numeric(changes, 'commits'),
  };
}

/** Groups a mixed stream by run, newest first. */
export function summariseRuns(events: HarnessEvent[]): RunSummary[] {
  const byRun = new Map<string, HarnessEvent[]>();

  for (const event of events) {
    const bucket = byRun.get(event.run_id);
    if (bucket) bucket.push(event);
    else byRun.set(event.run_id, [event]);
  }

  return [...byRun.values()]
    .map(summariseRun)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export const runsForFeature = (runs: RunSummary[], featureId: string): RunSummary[] =>
  runs.filter((run) => run.featureId === featureId);
