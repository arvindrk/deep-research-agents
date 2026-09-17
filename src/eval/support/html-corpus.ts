import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { MAX_FINDING_VALUE_CHARS } from '@/lib/research/html-meta';

import { readRepoFile } from './suite';

/**
 * A corpus of pages, one file per shape, with the parse expected of each
 * recorded beside it. Discovered by scanning the directory rather than listed
 * here, so adding a page is one file and the shapes covered stay visible from
 * outside the assertions.
 */
export const CORPUS_DIR = 'src/eval/fixtures/html-pages';

export const EXPECTATIONS_FILE = `${CORPUS_DIR}/expected.json`;

/** The shapes the parser has a branch for, which the corpus must cover. */
export const PAGE_SHAPES = [
  'attribute-order',
  'doctype-and-comments',
  'entity-escape',
  'meta-description',
  'no-metadata',
  'og-description-fallback',
  'og-title-fallback',
  'single-quoted-attributes',
  'title-element',
  'uppercase-tags',
  'value-cap',
  'whitespace-collapse',
] as const;

export type PageShape = (typeof PAGE_SHAPES)[number];

export type PageExpectation = {
  title: string;
  description: string;
  shapes: PageShape[];
};

export type CorpusPage = PageExpectation & { name: string; html: string };

/** Everything in the corpus directory, repo-relative, in a stable order. */
export const corpusFiles = (): string[] =>
  readdirSync(join(process.cwd(), CORPUS_DIR))
    .map((entry) => `${CORPUS_DIR}/${entry}`)
    .sort();

/** Page names on disk, without the extension. */
export const fixtureNames = (): string[] =>
  corpusFiles()
    .filter((path) => path.endsWith('.html'))
    .map((path) => path.slice(CORPUS_DIR.length + 1, -'.html'.length));

export const expectations = (): Record<string, PageExpectation> =>
  JSON.parse(readRepoFile(EXPECTATIONS_FILE)) as Record<
    string,
    PageExpectation
  >;

/** Each page with the parse recorded for it. */
export function corpusPages(): CorpusPage[] {
  const recorded = expectations();

  return fixtureNames().map((name) => {
    const expected = recorded[name];
    if (!expected) {
      throw new Error(`${name}.html has no recorded parse`);
    }
    return {
      name,
      html: readRepoFile(`${CORPUS_DIR}/${name}.html`),
      ...expected,
    };
  });
}

/** Meta tags whose content attribute is written before the key that names it. */
const contentBeforeKey = (html: string): boolean =>
  (html.match(/<meta\b[^>]*>/gi) ?? []).some(
    (tag) =>
      tag.indexOf('content') >= 0 &&
      tag.indexOf('content') < Math.max(tag.indexOf('property'), tag.indexOf('name')),
  );

const overCap = new RegExp(`content\\s*=\\s*"[^"]{${MAX_FINDING_VALUE_CHARS + 1},}"`);

/**
 * What a page must contain to claim a shape. A Record over the inventory, so a
 * shape cannot join the inventory without saying how a page exhibits it, and a
 * page cannot claim coverage it does not provide.
 */
export const SHAPE_EVIDENCE: Record<PageShape, (html: string) => boolean> = {
  'attribute-order': contentBeforeKey,
  'doctype-and-comments': (html) =>
    /<!doctype/i.test(html) && html.includes('<!--'),
  'entity-escape': (html) => /&(?:amp|lt|gt|quot|#39);/.test(html),
  'meta-description': (html) => /name\s*=\s*["']description["']/i.test(html),
  'no-metadata': (html) =>
    !/<title[^>]*>\s*\S/i.test(html) &&
    !/(?:name|property)\s*=\s*["'](?:og:)?(?:title|description)["']/i.test(html),
  'og-description-fallback': (html) =>
    /property\s*=\s*["']og:description["']/i.test(html) &&
    !/name\s*=\s*["']description["']/i.test(html),
  'og-title-fallback': (html) =>
    /(?:property|name)\s*=\s*["']og:title["']/i.test(html) &&
    !/<title[^>]*>\s*\S/i.test(html),
  'single-quoted-attributes': (html) => /content\s*=\s*'/.test(html),
  'title-element': (html) => /<title[^>]*>\s*\S/i.test(html),
  // Written as the page author wrote them, not lowercased on the way in.
  'uppercase-tags': (html) => /<(?:TITLE|META)\b/.test(html),
  'value-cap': (html) => overCap.test(html),
  'whitespace-collapse': (html) =>
    /<title[^>]*>[^<]*(?:\n|  )/i.test(html) ||
    /content\s*=\s*["'][^"']*(?:\n|  )/.test(html),
};
