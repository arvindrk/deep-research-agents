import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertHtmlResponse } from '@/lib/research/content-type';
import { readBoundedResponseText } from '@/lib/research/fetch-body';
import { assertPublicResearchDestination } from '@/lib/research/public-destination';
import { runResearch, type ResearchCollector } from '@/lib/research/runtime';
import {
  RESEARCH_FAILURE_REASONS,
  researchFailureReason,
  type ResearchFailureReason,
} from '@/lib/research/source-error';
import type { ResearchSourceId } from '@/lib/research/types';

/** Provoke the real error rather than restating its message here. */
const thrownBy = (run: () => unknown): unknown => {
  try {
    run();
    return null;
  } catch (error) {
    return error;
  }
};

const reasonOf = (run: () => unknown): ResearchFailureReason =>
  researchFailureReason(thrownBy(run));

describe('RESEARCH_FAILURE_REASONS', () => {
  it('is the closed set the run record may contain', () => {
    assert.deepEqual(
      [...RESEARCH_FAILURE_REASONS],
      [
        'blocked_destination',
        'redirect_failed',
        'non_html',
        'oversize_body',
        'http_status',
        'timeout',
        'network',
        'source_failed',
      ],
    );
  });

  it('holds no code that could carry a URL or a query string', () => {
    for (const reason of RESEARCH_FAILURE_REASONS) {
      assert.match(reason, /^[a-z_]+$/);
    }
  });
});

describe('classifying the errors this codebase actually throws', () => {
  it('classifies a blocked destination', () => {
    assert.equal(
      reasonOf(() => assertPublicResearchDestination('http://169.254.169.254/latest/')),
      'blocked_destination',
    );
    assert.equal(
      reasonOf(() => assertPublicResearchDestination('ftp://acme.test/')),
      'blocked_destination',
    );
    assert.equal(
      reasonOf(() => assertPublicResearchDestination('not a url')),
      'blocked_destination',
    );
  });

  it('classifies a non-HTML body', () => {
    assert.equal(
      reasonOf(() =>
        assertHtmlResponse(
          new Response('{}', { headers: { 'content-type': 'application/json' } }),
        ),
      ),
      'non_html',
    );
  });

  it('classifies an oversize body', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(32));
        controller.close();
      },
    });
    const error = await readBoundedResponseText(new Response(body), 8).then(
      () => null,
      (thrown: unknown) => thrown,
    );
    assert.equal(researchFailureReason(error), 'oversize_body');
  });

  it('classifies the status error the collectors throw', () => {
    assert.equal(
      researchFailureReason(new Error('Website request failed with status 503')),
      'http_status',
    );
    assert.equal(
      researchFailureReason(new Error('Careers request failed with status 404')),
      'http_status',
    );
  });

  it('classifies a redirect that could not be followed', () => {
    assert.equal(
      researchFailureReason(new Error('Redirect 302 without Location')),
      'redirect_failed',
    );
    assert.equal(
      researchFailureReason(new Error('Too many redirects (max 10)')),
      'redirect_failed',
    );
  });

  it('classifies an AbortSignal timeout by name, not by message', () => {
    const timeout = new Error('whatever this runtime calls it');
    timeout.name = 'TimeoutError';
    assert.equal(researchFailureReason(timeout), 'timeout');
  });

  it('classifies a network fault', () => {
    assert.equal(researchFailureReason(new TypeError('fetch failed')), 'network');
  });
});

describe('anything unrecognised becomes source_failed', () => {
  for (const [label, thrown] of [
    ['a plain Error', new Error('something went wrong')],
    ['a string', 'nope'],
    ['null', null],
    ['undefined', undefined],
    ['an object', { message: 'https://acme.test/secret?token=abc' }],
    ['a number', 500],
  ] as const) {
    it(`classifies ${label} without repeating it`, () => {
      const reason = researchFailureReason(thrown);
      assert.equal(reason, 'source_failed');
      assert.ok(RESEARCH_FAILURE_REASONS.some((known) => known === reason));
    });
  }

  it('never returns a value outside the closed set', () => {
    const shapes: unknown[] = [
      new Error('Research destination blocked: non-public host "10.0.0.1"'),
      new Error('Response body exceeds 1048576 bytes'),
      new Error('Website request failed with status 500'),
      new Error(''),
      new Error('fetch failed'),
      Symbol('x'),
      [],
    ];
    for (const shape of shapes) {
      assert.ok(
        RESEARCH_FAILURE_REASONS.some(
          (reason) => reason === researchFailureReason(shape),
        ),
      );
    }
  });
});

describe('what reaches the run record', () => {
  const SUBJECT = { id: 'c1', name: 'Acme', website: 'https://acme.test' };
  const OBSERVED_AT = '2026-09-09T06:00:00.000Z';

  const throwing = (source: ResearchSourceId, error: unknown): ResearchCollector => ({
    source,
    collect: async () => {
      throw error;
    },
  });

  const ok = (source: ResearchSourceId): ResearchCollector => ({
    source,
    collect: async () => [
      {
        source,
        field: `${source}_title`,
        value: 'Acme',
        evidence_url: 'https://acme.test/',
        observed_at: OBSERVED_AT,
        confidence: 'high',
      },
    ],
  });

  it('records the reason code, not the URL the collector was fetching', async () => {
    // The shape a collector really throws, with the URL appended the way an
    // upstream library would: the record must keep the code and drop the rest.
    const leaky = new Error(
      'Website request failed with status 500 for https://acme.test/internal?token=s3cret',
    );
    const run = await runResearch(SUBJECT, [throwing('website', leaky)], OBSERVED_AT);

    assert.deepEqual(run.failed, [{ source: 'website', error: 'http_status' }]);
    assert.doesNotMatch(JSON.stringify(run), /https?:\/\/acme\.test\/internal/);
    assert.doesNotMatch(JSON.stringify(run), /token=/);
  });

  it('keeps the run honestly partial when one source fails', async () => {
    const run = await runResearch(
      SUBJECT,
      [ok('website'), throwing('careers', new Error('Careers request failed with status 404'))],
      OBSERVED_AT,
    );

    assert.equal(run.status, 'partial');
    assert.deepEqual(run.succeeded, ['website']);
    assert.deepEqual(run.failed, [{ source: 'careers', error: 'http_status' }]);
  });

  it('keeps the run failed when every source fails, with codes for each', async () => {
    const run = await runResearch(
      SUBJECT,
      [
        throwing('website', new Error('Research destination blocked: non-public host "127.0.0.1"')),
        throwing('careers', new Error('Response body exceeds 1048576 bytes')),
      ],
      OBSERVED_AT,
    );

    assert.equal(run.status, 'failed');
    assert.deepEqual(run.failed, [
      { source: 'website', error: 'blocked_destination' },
      { source: 'careers', error: 'oversize_body' },
    ]);
    assert.doesNotMatch(JSON.stringify(run), /127\.0\.0\.1/);
  });
});
