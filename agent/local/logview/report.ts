import type { HarnessEvent } from './events';
import type { RunSummary } from './model';

const STATUS_MARK: Record<string, string> = {
  completed: 'ok',
  failed: 'FAIL',
  skipped: 'skip',
  'no-changes': 'none',
  running: '...',
};

const duration = (ms: number): string => {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`;
  return `${Math.floor(ms / 60_000)}m${Math.round((ms % 60_000) / 1000)}s`;
};

const pad = (value: string, width: number): string =>
  value.length >= width ? value.slice(0, width) : value.padEnd(width);

/** One line per run, newest first. */
export function renderRunList(runs: RunSummary[]): string {
  if (runs.length === 0) return 'No runs recorded yet.';

  const lines = [
    `${pad('RUN', 16)} ${pad('STATUS', 7)} ${pad('TIME', 7)} ${pad('FEATURE', 34)} VERDICT`,
    '-'.repeat(88),
  ];

  for (const run of runs) {
    const verdict =
      run.verdict === 'fail' ? `fail (${run.blockers} blocker${run.blockers === 1 ? '' : 's'})` : run.verdict || '-';
    lines.push(
      `${pad(run.runId, 16)} ${pad(STATUS_MARK[run.status] ?? run.status, 7)} ${pad(duration(run.durationMs), 7)} ` +
        `${pad(run.featureId || '-', 34)} ${verdict}`,
    );
  }

  const failed = runs.filter((run) => run.status === 'failed').length;
  const opened = runs.filter((run) => run.prUrl).length;
  lines.push('', `${runs.length} run(s), ${opened} pull request(s) opened, ${failed} failed.`);

  return lines.join('\n');
}

/** Everything that happened in one run, in order. */
export function renderRunTimeline(events: HarnessEvent[], summary: RunSummary): string {
  if (events.length === 0) return 'No events for that run.';

  const lines = [
    `Run ${summary.runId} on ${summary.branch || '(unknown branch)'} via ${summary.provider || 'unknown provider'}`,
    `Status ${summary.status}${summary.reason ? ` (${summary.reason})` : ''} in ${duration(summary.durationMs)}`,
    '',
  ];

  for (const event of events) {
    const detail = Object.entries(event)
      .filter(([key]) => !['ts', 'run_id', 'seq', 'type'].includes(key))
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(' ');
    lines.push(`  ${event.ts.slice(11)}  ${pad(event.type, 18)} ${detail}`);
  }

  if (summary.files) {
    lines.push('', `Changed ${summary.files} file(s), +${summary.additions}/-${summary.deletions} across ${summary.commits} commit(s).`);
  }
  if (summary.prUrl) lines.push(`Pull request: ${summary.prUrl}`);

  return lines.join('\n');
}

/** Every run that touched one feature, oldest first, so a retry loop is visible. */
export function renderFeatureHistory(runs: RunSummary[], featureId: string): string {
  if (runs.length === 0) return `No runs recorded for feature "${featureId}".`;

  const lines = [`Feature ${featureId}`, ''];

  for (const run of [...runs].reverse()) {
    const outcome = run.prUrl ? run.prUrl : `${run.status}${run.reason ? ` (${run.reason})` : ''}`;
    lines.push(`  ${run.startedAt}  ${pad(STATUS_MARK[run.status] ?? run.status, 7)} ${outcome}`);
  }

  const attempts = runs.length;
  const landed = runs.filter((run) => run.prUrl).length;
  lines.push('', `${attempts} attempt(s), ${landed} reached a pull request.`);

  return lines.join('\n');
}
