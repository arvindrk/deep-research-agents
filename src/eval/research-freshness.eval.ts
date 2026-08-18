import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ageInDays } from '@/lib/research/freshness';

const NOW = new Date('2026-08-18T12:00:00.000Z');
const daysBefore = (days: number): string =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe('ageInDays', () => {
  it('counts whole elapsed days', () => {
    assert.equal(ageInDays(daysBefore(0), NOW), 0);
    assert.equal(ageInDays(daysBefore(1), NOW), 1);
    assert.equal(ageInDays(daysBefore(45), NOW), 45);
  });

  it('rounds a part-day down rather than up', () => {
    assert.equal(ageInDays('2026-08-18T00:00:01.000Z', NOW), 0);
    assert.equal(ageInDays('2026-08-17T11:00:00.000Z', NOW), 1);
  });

  it('treats a future observation as brand new rather than negative', () => {
    assert.equal(ageInDays('2026-09-01T00:00:00.000Z', NOW), 0);
  });

  it('reports an unreadable timestamp as unknown, not as fresh', () => {
    assert.equal(ageInDays('', NOW), null);
    assert.equal(ageInDays('not a date', NOW), null);
  });
});
