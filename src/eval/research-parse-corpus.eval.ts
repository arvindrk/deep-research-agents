import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { headDescription, headTitle } from '@/lib/research/html-meta';

import {
  corpusFiles,
  corpusPages,
  EXPECTATIONS_FILE,
  expectations,
  fixtureNames,
  PAGE_SHAPES,
} from './support/html-corpus';

/**
 * The parser is regex over a byte-capped body, and its assertions were snippets
 * assembled inside a test file, so which page shapes it handles was invisible
 * from outside. The corpus makes the shapes the subject: one page per shape,
 * the expected parse beside it, and rules that fail when a shape is uncovered.
 */
describe('every page parses to the parse recorded beside it', () => {
  for (const page of corpusPages()) {
    it(`${page.name}`, () => {
      assert.deepEqual(
        {
          title: headTitle(page.html),
          description: headDescription(page.html),
        },
        { title: page.title, description: page.description },
      );
    });
  }
});

describe('the corpus describes itself', () => {
  it('records a parse for every page and a page for every parse', () => {
    assert.deepEqual(fixtureNames(), Object.keys(expectations()).sort());
  });

  it('holds nothing but pages and the parses recorded for them', () => {
    for (const path of corpusFiles()) {
      assert.ok(
        path.endsWith('.html') || path === EXPECTATIONS_FILE,
        `${path} is neither a page nor the file recording the parses`,
      );
    }
  });

  it('claims only shapes the inventory names', () => {
    for (const page of corpusPages()) {
      assert.ok(page.shapes.length > 0, `${page.name} claims no shape`);
      for (const shape of page.shapes) {
        assert.ok(
          PAGE_SHAPES.includes(shape),
          `${page.name} claims a shape the inventory does not name: ${shape}`,
        );
      }
    }
  });
});
