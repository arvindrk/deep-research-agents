import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { assertHtmlResponse } from '@/lib/research/content-type';
import { readBoundedResponseText } from '@/lib/research/fetch-body';
import { assertPublicResearchDestination } from '@/lib/research/public-destination';
import {
  RESEARCH_FAILURE_REASONS,
  researchFailureReason,
  type ResearchFailureReason,
} from '@/lib/research/source-error';

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
