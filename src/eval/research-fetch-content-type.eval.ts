import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  RESEARCH_HTML_CONTENT_TYPES,
  assertHtmlResponse,
  isHtmlContentType,
  mediaType,
} from '@/lib/research/content-type';

const REPO_ROOT = process.cwd();
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

/**
 * A string body makes the Response constructor default Content-Type to
 * text/plain, so the missing-header case has to be built with no body at all.
 */
const htmlResponse = (contentType: string | null): Response =>
  contentType === null
    ? new Response(null)
    : new Response('<html><head><title>Acme</title></head></html>', {
        headers: { 'content-type': contentType },
      });

describe('RESEARCH_HTML_CONTENT_TYPES', () => {
  it('accepts exactly the two HTML media types the extractors parse', () => {
    assert.deepEqual(
      [...RESEARCH_HTML_CONTENT_TYPES],
      ['text/html', 'application/xhtml+xml'],
    );
  });
});

describe('mediaType', () => {
  it('drops parameters, whitespace, and case', () => {
    assert.equal(mediaType('text/html'), 'text/html');
    assert.equal(mediaType('TEXT/HTML'), 'text/html');
    assert.equal(mediaType(' text/html ; charset=UTF-8'), 'text/html');
    assert.equal(mediaType('text/html;charset=utf-8;boundary=x'), 'text/html');
  });

  it('reports an absent or empty header as null rather than guessing', () => {
    assert.equal(mediaType(null), null);
    assert.equal(mediaType(''), null);
    assert.equal(mediaType('   '), null);
    assert.equal(mediaType('; charset=utf-8'), null);
  });
});

describe('isHtmlContentType', () => {
  it('accepts declared HTML with and without parameters', () => {
    assert.equal(isHtmlContentType('text/html'), true);
    assert.equal(isHtmlContentType('text/html; charset=utf-8'), true);
    assert.equal(isHtmlContentType('application/xhtml+xml'), true);
    assert.equal(isHtmlContentType('Application/XHTML+XML; charset=x'), true);
  });
});

describe('non-HTML bodies fail the source', () => {
  for (const contentType of [
    'application/json',
    'application/pdf',
    'text/plain',
    'image/png',
    'application/octet-stream',
    'text/xml',
  ]) {
    it(`rejects ${contentType}`, () => {
      assert.equal(isHtmlContentType(contentType), false);
      assert.throws(
        () => assertHtmlResponse(htmlResponse(contentType)),
        /non-HTML content type/,
      );
    });
  }

  it('rejects a missing header instead of parsing an unknown body', () => {
    assert.equal(isHtmlContentType(null), false);
    assert.throws(
      () => assertHtmlResponse(htmlResponse(null)),
      /non-HTML content type "missing"/,
    );
  });

  it('accepts a declared HTML response', () => {
    assert.doesNotThrow(() =>
      assertHtmlResponse(htmlResponse('text/html; charset=utf-8')),
    );
  });

  it('names only the media type, never the fetched URL', () => {
    const error = (() => {
      try {
        assertHtmlResponse(htmlResponse('application/json'));
        return null;
      } catch (thrown) {
        return thrown instanceof Error ? thrown.message : String(thrown);
      }
    })();

    assert.ok(error !== null, 'a non-HTML response must throw');
    assert.match(error, /application\/json/);
    assert.doesNotMatch(error, /https?:\/\//);
  });
});

describe('collectors gate on content type before parsing', () => {
  for (const path of [
    'src/lib/research/website.ts',
    'src/lib/research/careers.ts',
  ]) {
    const source = read(path);

    it(`${path} calls assertHtmlResponse`, () => {
      assert.match(source, /assertHtmlResponse\(response\)/);
      assert.match(source, /from '\.\/content-type'/);
    });

    it(`${path} gates before it reads the body`, () => {
      const gate = source.indexOf('assertHtmlResponse(response)');
      const readBody = source.indexOf('readBoundedResponseText(response)');
      assert.ok(gate > -1 && readBody > -1);
      assert.ok(
        gate < readBody,
        'the content type gate must run before the body is read',
      );
    });

    it(`${path} keeps the public-destination guard and the byte cap`, () => {
      assert.match(source, /fetchResearchResponse\(/);
      assert.match(source, /readBoundedResponseText\(/);
    });
  }
});
