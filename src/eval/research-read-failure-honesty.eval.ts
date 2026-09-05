import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  RESEARCH_EMPTY_FINDINGS_COPY,
  RESEARCH_EMPTY_HISTORY_COPY,
  RESEARCH_LOAD_FAILURE_COPY,
  researchEmptyStateCopy,
} from '@/lib/research/run-summary';

describe('researchEmptyStateCopy', () => {
  it('uses distinct closed strings for empty history vs load failure', () => {
    const emptyHistory = researchEmptyStateCopy({
      historyLoaded: true,
      hasLatestRun: false,
    });
    const loadFailure = researchEmptyStateCopy({
      historyLoaded: false,
      hasLatestRun: false,
    });

    assert.equal(emptyHistory, RESEARCH_EMPTY_HISTORY_COPY);
    assert.equal(loadFailure, RESEARCH_LOAD_FAILURE_COPY);
    assert.notEqual(emptyHistory, loadFailure);
    assert.match(emptyHistory, /no research has run/i);
    assert.match(loadFailure, /unable to load research history/i);
    assert.equal(/no research has run/i.test(loadFailure), false);
  });

  it('keeps success with a run and no findings on the empty-findings sentence', () => {
    const copy = researchEmptyStateCopy({
      historyLoaded: true,
      hasLatestRun: true,
    });
    assert.equal(copy, RESEARCH_EMPTY_FINDINGS_COPY);
    assert.match(copy, /found nothing to report/i);
    assert.equal(/no research has run/i.test(copy), false);
    assert.equal(/unable to load/i.test(copy), false);
  });

  it('never expects driver or QueryResult error text in closed copy', () => {
    for (const copy of [
      RESEARCH_EMPTY_HISTORY_COPY,
      RESEARCH_LOAD_FAILURE_COPY,
      RESEARCH_EMPTY_FINDINGS_COPY,
      researchEmptyStateCopy({ historyLoaded: false, hasLatestRun: true }),
      researchEmptyStateCopy({ historyLoaded: false, hasLatestRun: false }),
    ]) {
      assert.equal(/queryresult/i.test(copy), false, copy);
      assert.equal(/failed to read research/i.test(copy), false, copy);
      assert.equal(/ECONN|postgres|neon|sqlstate/i.test(copy), false, copy);
      assert.equal(/\$\{|error\.message/i.test(copy), false, copy);
    }
  });

  it('covers the success+[] never-researched path as a closed constant', () => {
    assert.equal(
      researchEmptyStateCopy({ historyLoaded: true, hasLatestRun: false }),
      'No research has run for this company yet.',
    );
  });
});
