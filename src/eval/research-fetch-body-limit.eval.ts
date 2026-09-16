import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { parseCareersFindings } from '@/lib/research/careers';
import {
  MAX_RESEARCH_FETCH_BODY_BYTES,
  readBoundedResponseText,
} from '@/lib/research/fetch-body';
import { parseWebsiteFindings } from '@/lib/research/website';

const REPO_ROOT = process.cwd();
const OBSERVED_AT = '2026-08-20T12:00:00.000Z';
const SITE = 'https://acme.test/';
const CAREERS = 'https://acme.test/careers';
const ONE_MIB = 1_048_576;

const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

/** Fake Response whose body is a ReadableStream (no Content-Length). */
function streamedResponse(chunks: Uint8Array[]): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
  return new Response(stream);
}

function utf8Chunks(text: string, chunkBytes: number): Uint8Array[] {
  const bytes = new TextEncoder().encode(text);
  const out: Uint8Array[] = [];
  for (let i = 0; i < bytes.byteLength; i += chunkBytes) {
    out.push(bytes.subarray(i, Math.min(i + chunkBytes, bytes.byteLength)));
  }
  return out;
}

describe('MAX_RESEARCH_FETCH_BODY_BYTES', () => {
  it('is at most 1 MiB', () => {
    assert.ok(
      MAX_RESEARCH_FETCH_BODY_BYTES <= ONE_MIB,
      `cap ${MAX_RESEARCH_FETCH_BODY_BYTES} exceeds locked maximum ${ONE_MIB}`,
    );
    assert.equal(MAX_RESEARCH_FETCH_BODY_BYTES, ONE_MIB);
  });
});

describe('collectors use readBoundedResponseText', () => {
  for (const path of [
    'src/lib/research/website.ts',
    'src/lib/research/careers.ts',
  ] as const) {
    it(`${path} streams through the shared helper and skips response.text()`, () => {
      const source = read(path);
      assert.match(
        source,
        /readBoundedResponseText\s*\(\s*response\s*\)/,
        `${path} must call readBoundedResponseText(response)`,
      );
      assert.doesNotMatch(
        source,
        /response\.text\s*\(/,
        `${path} must not await response.text() directly`,
      );
    });
  }
});

describe('readBoundedResponseText', () => {
  it('returns under-limit HTML that still parses into findings', async () => {
    const html =
      '<!doctype html><html><head>' +
      '<title>Acme</title>' +
      '<meta name="description" content="Builds rockets.">' +
      '</head><body>ok</body></html>';

    const text = await readBoundedResponseText(
      streamedResponse(utf8Chunks(html, 32)),
    );
    assert.equal(text, html);

    const website = parseWebsiteFindings(text, SITE, OBSERVED_AT);
    assert.deepEqual(
      website.map((f) => [f.field, f.value]),
      [
        ['website_title', 'Acme'],
        ['website_description', 'Builds rockets.'],
      ],
    );

    const careers = parseCareersFindings(text, CAREERS, OBSERVED_AT);
    assert.deepEqual(
      careers.map((f) => [f.field, f.value]),
      [
        ['careers_title', 'Acme'],
        ['careers_description', 'Builds rockets.'],
      ],
    );
  });

  it('rejects an oversize body with no Content-Length', async () => {
    const oversize = 'x'.repeat(MAX_RESEARCH_FETCH_BODY_BYTES + 1);
    await assert.rejects(
      () =>
        readBoundedResponseText(
          streamedResponse(utf8Chunks(oversize, 64 * 1024)),
        ),
      /exceeds/,
    );
  });

  it('rejects once a multi-chunk stream crosses the cap', async () => {
    const first = new Uint8Array(MAX_RESEARCH_FETCH_BODY_BYTES);
    const second = new Uint8Array(1);
    await assert.rejects(
      () => readBoundedResponseText(streamedResponse([first, second])),
      /exceeds/,
    );
  });

  it('accepts a body exactly at the cap', async () => {
    const exact = 'a'.repeat(MAX_RESEARCH_FETCH_BODY_BYTES);
    const text = await readBoundedResponseText(
      streamedResponse(utf8Chunks(exact, 128 * 1024)),
    );
    assert.equal(text.length, MAX_RESEARCH_FETCH_BODY_BYTES);
  });
});
