import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  asResearchFailureReason,
  researchFailureReason,
  RESEARCH_FAILURE_REASONS,
} from '@/lib/research/source-error';

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

/** What a row can actually hold: anything, including the message it must not. */
const UNCHECKED = [
  'Website request failed with status 404 for https://acme.test/?token=abc123',
  'ECONNRESET',
  'timeout ',
  ' timeout',
  'TIMEOUT',
  'http status',
  'source_failed_',
  '',
  null,
  undefined,
  0,
  42,
  true,
  {},
  [],
  ['timeout'],
  { error: 'timeout' },
];

describe('asResearchFailureReason', () => {
  it('passes every member of the closed set through unchanged', () => {
    for (const reason of RESEARCH_FAILURE_REASONS) {
      assert.equal(asResearchFailureReason(reason), reason);
    }
  });

  it('answers source_failed for anything it does not recognise', () => {
    for (const value of UNCHECKED) {
      assert.equal(
        asResearchFailureReason(value),
        'source_failed',
        JSON.stringify(value ?? null),
      );
    }
  });

  it('never returns a value outside the closed set', () => {
    for (const value of [...UNCHECKED, ...RESEARCH_FAILURE_REASONS]) {
      const reason: string = asResearchFailureReason(value);
      assert.ok(
        RESEARCH_FAILURE_REASONS.some((member) => member === reason),
        `${JSON.stringify(value ?? null)} produced ${reason}`,
      );
    }
  });

  it('keeps the message it was handed out of its answer', () => {
    const stored = 'Website request failed for https://acme.test/?token=abc123';
    const reason: string = asResearchFailureReason(stored);
    assert.doesNotMatch(reason, /acme\.test|token|abc123|http/);
  });

  it('round-trips everything the classifier can produce', () => {
    const provoked = [
      new Error('research destination blocked: private address'),
      new Error('non-HTML content type: application/pdf'),
      new Error('body exceeds 524288 bytes'),
      new Error('Website request failed with status 503'),
      new Error('redirect to a different host was not followed'),
      new Error('fetch failed'),
      new Error('something nobody has classified'),
      'not an error at all',
    ];

    for (const error of provoked) {
      const classified = researchFailureReason(error);
      assert.equal(asResearchFailureReason(classified), classified);
    }
  });
});

describe('the row parser', () => {
  const source = read('src/db/queries/research.ts');

  it('narrows the stored reason instead of trusting the text', () => {
    assert.match(source, /error: asResearchFailureReason\(record\.error\)/);
    assert.doesNotMatch(
      source,
      /typeof record\.error === 'string'/,
      'a string check is not a check of the closed set',
    );
  });

  it('keeps a failure whose reason it could not recognise', () => {
    // The guard is on the source, never on the reason: dropping the failure
    // would make the run read better than it was.
    assert.match(source, /const source = asSource\(record\.source\);\s*\n\s*if \(source\) \{/);
  });

  it('holds no second copy of the closed set', () => {
    assert.doesNotMatch(source, /'blocked_destination'|'oversize_body'|'non_html'/);
    assert.match(source, /from '@\/lib\/research\/source-error'/);
  });
});
