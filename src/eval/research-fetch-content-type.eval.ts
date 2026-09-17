import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { assertHtmlResearchContentType } from '@/lib/research/content-type';

const REPO_ROOT = process.cwd();
const read = (path: string) => readFileSync(join(REPO_ROOT, path), 'utf8');

const ALLOWED: string[] = [
  'text/html',
  'text/html; charset=utf-8',
  'TEXT/HTML',
  'Text/HTML; Charset=UTF-8',
  'application/xhtml+xml',
  'application/xhtml+xml; charset=utf-8',
  'APPLICATION/XHTML+XML',
];

const REJECTED: Array<string | null> = [
  null,
  '',
  '   ',
  'application/json',
  'application/json; charset=utf-8',
  'image/png',
  'image/*',
  'application/octet-stream',
  'text/plain',
  'text/plain; charset=utf-8',
];

describe('assertHtmlResearchContentType', () => {
  for (const header of ALLOWED) {
    it(`allows ${JSON.stringify(header)}`, () => {
      assert.doesNotThrow(() => assertHtmlResearchContentType(header));
    });
  }

  for (const header of REJECTED) {
    it(`rejects ${JSON.stringify(header)} by throwing`, () => {
      assert.throws(
        () => assertHtmlResearchContentType(header),
        /Content-Type|HTML/i,
      );
    });
  }
});

describe('collectors call Content-Type guard before body read', () => {
  for (const path of [
    'src/lib/research/website.ts',
    'src/lib/research/careers.ts',
  ] as const) {
    it(`${path} asserts Content-Type before readBoundedResponseText`, () => {
      const source = read(path);
      assert.match(
        source,
        /assertHtmlResearchContentType\s*\(\s*response\.headers\.get\(\s*['"]content-type['"]\s*\)\s*\)/,
        `${path} must call assertHtmlResearchContentType on response Content-Type`,
      );
      assert.match(
        source,
        /readBoundedResponseText\s*\(\s*response\s*\)/,
        `${path} must still call readBoundedResponseText(response)`,
      );

      const guardAt = source.indexOf('assertHtmlResearchContentType');
      const bodyAt = source.indexOf('readBoundedResponseText');
      assert.ok(guardAt >= 0 && bodyAt >= 0, `${path} must contain both calls`);
      assert.ok(
        guardAt < bodyAt,
        `${path} must call Content-Type guard before readBoundedResponseText`,
      );
    });
  }
});
