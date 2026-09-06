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

const htmlResponse = (contentType: string | null): Response =>
  new Response('<html><head><title>Acme</title></head></html>', {
    headers: contentType === null ? {} : { 'content-type': contentType },
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
