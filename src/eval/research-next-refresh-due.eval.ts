import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { FRESHNESS_THRESHOLDS_DAYS } from '@/lib/research/freshness';
import {
  daysUntilRefresh,
  refreshDueAt,
  refreshDueCopy,
  refreshDueDateTime,
} from '@/lib/research/refresh-due';
import { selectResearchSchedule } from '@/lib/research/schedule';

const REPO_ROOT = process.cwd();
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-09-11T08:00:00.000Z');
const agedDays = (days: number): string =>
  new Date(NOW.getTime() - days * MS_PER_DAY).toISOString();

describe('the due date comes from the shared threshold', () => {
  it('is the first day the run is no longer fresh, not the threshold itself', () => {
    const observedAt = '2026-09-01T00:00:00.000Z';
    assert.equal(
      refreshDueAt(observedAt)?.toISOString(),
      new Date(
        new Date(observedAt).getTime() +
          (FRESHNESS_THRESHOLDS_DAYS.fresh + 1) * MS_PER_DAY,
      ).toISOString(),
      'the fresh band is inclusive, so the threshold day is still fresh',
    );
  });

  it('exposes it as a machine-readable attribute', () => {
    assert.equal(
      refreshDueDateTime('2026-09-01T00:00:00.000Z'),
      '2026-09-09T00:00:00.000Z',
    );
  });

  it('has no due date for a time it cannot read', () => {
    assert.equal(refreshDueAt('not a date'), null);
    assert.equal(refreshDueAt(''), null);
    assert.equal(refreshDueDateTime('nonsense'), null);
  });
});

describe('the countdown', () => {
  it('starts one day past the threshold on the day of observation', () => {
    assert.equal(
      daysUntilRefresh(agedDays(0), NOW),
      FRESHNESS_THRESHOLDS_DAYS.fresh + 1,
    );
  });

  it('is still one day away on the threshold day, which is fresh', () => {
    assert.equal(daysUntilRefresh(agedDays(FRESHNESS_THRESHOLDS_DAYS.fresh), NOW), 1);
  });

  it('reaches zero on the first non-fresh day', () => {
    assert.equal(
      daysUntilRefresh(agedDays(FRESHNESS_THRESHOLDS_DAYS.fresh + 1), NOW),
      0,
    );
  });

  it('goes negative the day after that', () => {
    assert.equal(
      daysUntilRefresh(agedDays(FRESHNESS_THRESHOLDS_DAYS.fresh + 2), NOW),
      -1,
    );
  });

  it('rounds a part-day towards the day it is still due', () => {
    const halfPast = new Date(
      NOW.getTime() - (FRESHNESS_THRESHOLDS_DAYS.fresh + 0.5) * MS_PER_DAY,
    ).toISOString();
    assert.equal(daysUntilRefresh(halfPast, NOW), 1);
  });

  it('is null for an unreadable observation time', () => {
    assert.equal(daysUntilRefresh('not a date', NOW), null);
  });
});

describe('the copy a reader sees', () => {
  it('counts down in days, with singular and plural', () => {
    assert.equal(refreshDueCopy(agedDays(0), NOW), 'Refresh due in 8 days');
    assert.equal(
      refreshDueCopy(agedDays(FRESHNESS_THRESHOLDS_DAYS.fresh), NOW),
      'Refresh due in 1 day',
    );
  });

  it('says due now on the first non-fresh day, not overdue by zero', () => {
    assert.equal(
      refreshDueCopy(agedDays(FRESHNESS_THRESHOLDS_DAYS.fresh + 1), NOW),
      'Refresh due now',
    );
  });

  it('counts up once it is overdue', () => {
    assert.equal(
      refreshDueCopy(agedDays(FRESHNESS_THRESHOLDS_DAYS.fresh + 2), NOW),
      'Refresh overdue by 1 day',
    );
    assert.equal(
      refreshDueCopy(agedDays(FRESHNESS_THRESHOLDS_DAYS.fresh + 31), NOW),
      'Refresh overdue by 30 days',
    );
  });

  it('says unknown rather than counting from a bad date', () => {
    assert.equal(refreshDueCopy('not a date', NOW), 'Refresh timing unknown');
    assert.equal(refreshDueCopy('', NOW), 'Refresh timing unknown');
  });

  it('never leaks a URL or a negative number into the copy', () => {
    for (const age of [0, 3, 7, 8, 100]) {
      const copy = refreshDueCopy(agedDays(age), NOW);
      assert.doesNotMatch(copy, /https?:\/\//);
      assert.doesNotMatch(copy, /-\d/);
    }
  });
});

describe('the page and the scheduler agree', () => {
  it('is due or overdue exactly when the scheduler stops skipping as fresh', () => {
    for (let age = 0; age <= 40; age += 1) {
      const observedAt = agedDays(age);
      const remaining = daysUntilRefresh(observedAt, NOW);
      assert.ok(remaining !== null);

      const schedule = selectResearchSchedule(
        [{ company_id: 'c1', newest_finding_at: observedAt }],
        NOW,
        10,
      );
      const skippedAsFresh = schedule.skipped.some(
        (skip) => skip.company_id === 'c1' && skip.reason === 'fresh',
      );

      assert.equal(
        remaining <= 0,
        !skippedAsFresh,
        `age ${age}: the page and the scheduler disagree`,
      );
    }
  });

  it('agrees on the first non-fresh day itself', () => {
    const observedAt = agedDays(FRESHNESS_THRESHOLDS_DAYS.fresh + 1);
    assert.equal(daysUntilRefresh(observedAt, NOW), 0);
    assert.deepEqual(
      selectResearchSchedule(
        [{ company_id: 'c1', newest_finding_at: observedAt }],
        NOW,
        10,
      ).selected,
      ['c1'],
    );
  });
});

describe('the helpers and the section read no clock', () => {
  const helper = read('src/lib/research/refresh-due.ts');
  const component = read('src/components/company-evidence.tsx');

  it('never reads the current time inside the helper module', () => {
    assert.doesNotMatch(helper, /Date\.now\(\)/);
    assert.doesNotMatch(helper, /new Date\(\)/);
    assert.match(helper, /now: Date/, 'the clock must arrive as an argument');
  });

  it('derives the threshold from the freshness module, not a copy', () => {
    assert.match(helper, /from '\.\/freshness'/);
    assert.match(helper, /FRESHNESS_THRESHOLDS_DAYS\.fresh/);
    assert.doesNotMatch(helper, /=\s*7\b/, 'no second copy of the threshold');
  });

  it('passes the request clock through to the payload, not a new one', () => {
    const payload = read('src/lib/research/api-payload.ts');
    assert.match(payload, /refreshDueCopy\(observedAt, input\.now\)/);
    assert.match(payload, /daysUntilRefresh\(observedAt, input\.now\)/);
    assert.doesNotMatch(payload, /new Date\(\)/);
    assert.match(component, /now,\n\s*\}\);/, 'the section forwards its clock');
    assert.doesNotMatch(component, /refreshDueCopy\(/, 'no second timing path');
  });

  it('renders the due date as a machine-readable time when it is known', () => {
    assert.match(component, /refresh\.due_at \? \(/);
    assert.match(component, /<time\s*\n?\s*dateTime=\{refresh\.due_at\}/);
  });

  it('keeps the section a Server Component with token styling only', () => {
    assert.doesNotMatch(component, /^\s*['"]use client['"]/);
    assert.match(component, /text-\[var\(--color-text-tertiary\)\]/);
    assert.doesNotMatch(component, /#[0-9a-fA-F]{3,6}\b/);
  });
});
