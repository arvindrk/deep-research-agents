import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { formatBatch } from '@/lib/format-batch';

describe('formatBatch', () => {
  it('abbreviates every known season', () => {
    assert.equal(formatBatch('Winter 2024'), 'W24');
    assert.equal(formatBatch('Summer 2024'), 'S24');
    assert.equal(formatBatch('Fall 2024'), 'F24');
    assert.equal(formatBatch('Spring 2024'), 'X24');
  });

  it('keeps the last two digits of the year', () => {
    assert.equal(formatBatch('Summer 2005'), 'S05');
    assert.equal(formatBatch('Winter 1999'), 'W99');
  });

  it('passes through anything it does not recognise', () => {
    for (const input of ['', 'IK12', 'Winter', '2024', 'Autumn 2024', 'winter 2024', 'Winter 24']) {
      assert.equal(formatBatch(input), input, `expected passthrough for ${JSON.stringify(input)}`);
    }
  });

  it('rejects surrounding whitespace rather than mangling it', () => {
    assert.equal(formatBatch(' Winter 2024'), ' Winter 2024');
    assert.equal(formatBatch('Winter 2024 '), 'Winter 2024 ');
  });

  it('never returns a string containing "undefined"', () => {
    for (const input of ['Winter 2024', 'Autumn 2024', '', 'Spring 0000']) {
      assert.ok(!formatBatch(input).includes('undefined'), `leaked undefined for ${JSON.stringify(input)}`);
    }
  });
});
