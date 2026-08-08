import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseEvents } from '../../agent/local/logview/events';
import { runsForFeature, summariseRun, summariseRuns } from '../../agent/local/logview/model';
import { renderFeatureHistory, renderRunList, renderRunTimeline } from '../../agent/local/logview/report';

const line = (event: Record<string, unknown>) => JSON.stringify(event);

const RUN = [
  line({ ts: '2026-08-07T10:00:00', run_id: 'r1', seq: 1, type: 'run.start', branch: 'harness/continue-local-r1', provider: 'grok' }),
  line({ ts: '2026-08-07T10:00:05', run_id: 'r1', seq: 2, type: 'feature.selected', feature_id: 'hybrid-search-api', title: 'Add the search endpoint' }),
  line({ ts: '2026-08-07T10:04:00', run_id: 'r1', seq: 3, type: 'impl.changes', files: 4, additions: 120, deletions: 8, commits: 4 }),
  line({ ts: '2026-08-07T10:05:00', run_id: 'r1', seq: 4, type: 'validation', verdict: 'pass', blockers: 0 }),
  line({ ts: '2026-08-07T10:05:30', run_id: 'r1', seq: 5, type: 'pr.opened', url: 'https://github.com/o/r/pull/7' }),
  line({ ts: '2026-08-07T10:05:31', run_id: 'r1', seq: 6, type: 'run.end', status: 'completed', duration_ms: 331000 }),
].join('\n');

describe('parseEvents', () => {
  it('reads a well-formed stream', () => {
    assert.equal(parseEvents(RUN).length, 6);
  });

  it('survives a truncated final line', () => {
    // The writer is a shell script appending while the run is in flight, so a
    // half-written last line is normal. Losing it must not cost the stream.
    const events = parseEvents(`${RUN}\n{"ts":"2026-08-07T10:06:00","run_id":"r1","seq":7,"ty`);
    assert.equal(events.length, 6);
  });

  it('discards lines that are valid JSON but not events', () => {
    assert.equal(parseEvents('{"hello":"world"}\n[1,2,3]\nnull\n"text"').length, 0);
  });

  it('ignores blank lines and returns nothing for empty input', () => {
    assert.deepEqual(parseEvents(''), []);
    assert.deepEqual(parseEvents('\n\n  \n'), []);
  });

  it('orders by timestamp then sequence', () => {
    const shuffled = [
      line({ ts: '2026-08-07T10:00:05', run_id: 'r1', seq: 2, type: 'b' }),
      line({ ts: '2026-08-07T10:00:00', run_id: 'r1', seq: 1, type: 'a' }),
      line({ ts: '2026-08-07T10:00:05', run_id: 'r1', seq: 3, type: 'c' }),
    ].join('\n');
    assert.deepEqual(parseEvents(shuffled).map((event) => event.type), ['a', 'b', 'c']);
  });
});

describe('summariseRun', () => {
  const summary = summariseRun(parseEvents(RUN));

  it('folds a completed run', () => {
    assert.equal(summary.runId, 'r1');
    assert.equal(summary.status, 'completed');
    assert.equal(summary.featureId, 'hybrid-search-api');
    assert.equal(summary.verdict, 'pass');
    assert.equal(summary.prUrl, 'https://github.com/o/r/pull/7');
    assert.equal(summary.durationMs, 331000);
    assert.equal(summary.commits, 4);
  });

  it('reports a run with no end event as still running', () => {
    const partial = summariseRun(parseEvents(RUN.split('\n').slice(0, 3).join('\n')));
    assert.equal(partial.status, 'running');
    assert.equal(partial.durationMs, 0);
  });

  it('treats an unrecognised status as running rather than inventing one', () => {
    const odd = parseEvents(line({ ts: '2026-08-07T10:00:00', run_id: 'r9', seq: 1, type: 'run.end', status: 'banana' }));
    assert.equal(summariseRun(odd).status, 'running');
  });

  it('falls back to elapsed time when duration is absent', () => {
    const noDuration = parseEvents(
      [
        line({ ts: '2026-08-07T10:00:00', run_id: 'r2', seq: 1, type: 'run.start' }),
        line({ ts: '2026-08-07T10:00:10', run_id: 'r2', seq: 2, type: 'run.end', status: 'failed', reason: 'validation-fail' }),
      ].join('\n'),
    );
    const failed = summariseRun(noDuration);
    assert.equal(failed.durationMs, 10_000);
    assert.equal(failed.reason, 'validation-fail');
  });

  it('does not throw on an empty stream', () => {
    const empty = summariseRun([]);
    assert.equal(empty.runId, '');
    assert.equal(empty.status, 'running');
  });
});

describe('summariseRuns', () => {
  const mixed = parseEvents(
    [
      RUN,
      line({ ts: '2026-08-07T11:00:00', run_id: 'r2', seq: 1, type: 'run.start', branch: 'b2' }),
      line({ ts: '2026-08-07T11:01:00', run_id: 'r2', seq: 2, type: 'feature.selected', feature_id: 'hybrid-search-api' }),
      line({ ts: '2026-08-07T11:02:00', run_id: 'r2', seq: 3, type: 'validation', verdict: 'fail', blockers: 2 }),
      line({ ts: '2026-08-07T11:02:01', run_id: 'r2', seq: 4, type: 'run.end', status: 'failed', reason: 'validation-fail' }),
    ].join('\n'),
  );
  const runs = summariseRuns(mixed);

  it('splits a mixed stream by run, newest first', () => {
    assert.equal(runs.length, 2);
    assert.deepEqual(runs.map((run) => run.runId), ['r2', 'r1']);
  });

  it('finds every attempt at one feature', () => {
    assert.equal(runsForFeature(runs, 'hybrid-search-api').length, 2);
    assert.equal(runsForFeature(runs, 'nothing-like-this').length, 0);
  });
});

describe('rendering', () => {
  const runs = summariseRuns(parseEvents(RUN));

  it('says so plainly when there is nothing to show', () => {
    assert.match(renderRunList([]), /No runs recorded/);
    assert.match(renderFeatureHistory([], 'x'), /No runs recorded for feature "x"/);
    assert.match(renderRunTimeline([], summariseRun([])), /No events/);
  });

  it('surfaces the facts a reader came for', () => {
    const listed = renderRunList(runs);
    assert.match(listed, /r1/);
    assert.match(listed, /hybrid-search-api/);
    assert.match(listed, /pass/);
    assert.match(listed, /1 run\(s\), 1 pull request\(s\) opened, 0 failed/);
  });

  it('shows the blocker count on a failed verdict', () => {
    const failing = summariseRuns(
      parseEvents(
        [
          line({ ts: '2026-08-07T12:00:00', run_id: 'r3', seq: 1, type: 'run.start' }),
          line({ ts: '2026-08-07T12:01:00', run_id: 'r3', seq: 2, type: 'validation', verdict: 'fail', blockers: 3 }),
          line({ ts: '2026-08-07T12:01:01', run_id: 'r3', seq: 3, type: 'run.end', status: 'failed' }),
        ].join('\n'),
      ),
    );
    assert.match(renderRunList(failing), /fail \(3 blockers\)/);
  });

  it('renders a timeline with the change summary and pull request', () => {
    const timeline = renderRunTimeline(parseEvents(RUN), runs[0]);
    assert.match(timeline, /harness\/continue-local-r1/);
    assert.match(timeline, /Changed 4 file\(s\), \+120\/-8 across 4 commit\(s\)/);
    assert.match(timeline, /pull\/7/);
  });

  it('renders feature history oldest first so a retry loop is visible', () => {
    const history = renderFeatureHistory(runs, 'hybrid-search-api');
    assert.match(history, /Feature hybrid-search-api/);
    assert.match(history, /1 attempt\(s\), 1 reached a pull request/);
  });
});
