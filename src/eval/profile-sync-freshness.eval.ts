import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { FRESHNESS_THRESHOLDS_DAYS } from '@/lib/research/freshness';
import {
  SYNC_FRESHNESS_LABEL,
  syncDateTime,
  syncFreshnessLabel,
  syncFreshnessOf,
  syncRelativeAge,
} from '@/lib/research/sync-freshness';

const NOW = new Date('2026-09-09T12:00:00.000Z');
const daysBefore = (days: number): string =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe('SYNC_FRESHNESS_LABEL', () => {
  it('matches CompanyEvidence FRESHNESS_LABEL wording exactly', () => {
    assert.deepEqual(SYNC_FRESHNESS_LABEL, {
      fresh: 'Fresh',
      aging: 'Aging',
      stale: 'Stale',
      unknown: 'Age unknown',
    });
  });

  it('stays a closed four-band map', () => {
    assert.deepEqual(Object.keys(SYNC_FRESHNESS_LABEL).sort(), [
      'aging',
      'fresh',
      'stale',
      'unknown',
    ]);
  });
});

describe('syncFreshnessOf', () => {
  it('holds the band on each side of every FRESHNESS_THRESHOLDS_DAYS edge', () => {
    const { fresh, aging } = FRESHNESS_THRESHOLDS_DAYS;
    assert.equal(syncFreshnessOf(daysBefore(0), NOW), 'fresh');
    assert.equal(syncFreshnessOf(daysBefore(fresh), NOW), 'fresh');
    assert.equal(syncFreshnessOf(daysBefore(fresh + 1), NOW), 'aging');
    assert.equal(syncFreshnessOf(daysBefore(aging), NOW), 'aging');
    assert.equal(syncFreshnessOf(daysBefore(aging + 1), NOW), 'stale');
  });

  it('accepts Date as well as string without forking thresholds', () => {
    const { fresh } = FRESHNESS_THRESHOLDS_DAYS;
    const asDate = new Date(daysBefore(fresh + 1));
    assert.equal(syncFreshnessOf(asDate, NOW), 'aging');
    assert.equal(syncFreshnessLabel(asDate, NOW), 'Aging');
  });

  it('reports an unreadable sync time as unknown', () => {
    assert.equal(syncFreshnessOf('not-a-date', NOW), 'unknown');
    assert.equal(syncFreshnessLabel('not-a-date', NOW), 'Age unknown');
  });
});

describe('syncRelativeAge and syncDateTime', () => {
  it('reuses relativeAge wording for readable timestamps', () => {
    assert.equal(syncRelativeAge(daysBefore(0), NOW), 'today');
    assert.equal(syncRelativeAge(daysBefore(1), NOW), 'yesterday');
    assert.equal(syncRelativeAge(daysBefore(3), NOW), '3 days ago');
  });

  it('exposes an ISO dateTime when the timestamp parses', () => {
    const iso = daysBefore(2);
    assert.equal(syncDateTime(iso), iso);
    assert.equal(syncDateTime(new Date(iso)), iso);
  });

  it('returns null dateTime and date-unknown age when unreadable', () => {
    assert.equal(syncDateTime('garbage'), null);
    assert.equal(syncRelativeAge('garbage', NOW), 'date unknown');
  });
});

describe('sync-freshness module hermeticity', () => {
  it('does not read the wall clock inside the pure module', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/research/sync-freshness.ts'),
      'utf8',
    );
    assert.doesNotMatch(source, /Date\.now\s*\(/);
    assert.doesNotMatch(source, /new Date\s*\(\s*\)/);
  });
});
