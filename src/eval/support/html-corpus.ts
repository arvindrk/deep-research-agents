import { readdirSync } from 'node:fs';
import { join } from 'node:path';

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
  'doctype-and-comments',
  'entity-escape',
  'meta-description',
  'no-metadata',
  'og-description-fallback',
  'og-title-fallback',
  'title-element',
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
