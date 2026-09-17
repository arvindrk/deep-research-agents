import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  collapseValue,
  decodeHtmlEntities,
  DESCRIPTION_META_KEYS,
  headDescription,
  headTitle,
  MAX_FINDING_VALUE_CHARS,
  tagAttributeSets,
} from '@/lib/research/html-meta';

import { readRepoFile } from './support/suite';
import {
  corpusFiles,
  corpusPages,
  EXPECTATIONS_FILE,
  expectations,
  fixtureNames,
  PAGE_SHAPES,
  SHAPE_EVIDENCE,
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

describe('the corpus exercises the bounds the parser applies', () => {
  it('carries a page whose value reaches the shared cap exactly', () => {
    const atCap = corpusPages().filter(
      (page) =>
        page.title.length === MAX_FINDING_VALUE_CHARS ||
        page.description.length === MAX_FINDING_VALUE_CHARS,
    );
    assert.ok(
      atCap.length > 0,
      `no page reaches the ${MAX_FINDING_VALUE_CHARS}-character cap, so nothing measures it`,
    );
  });

  it('carries every entity the parser decodes, decoded in the recorded parse', () => {
    // Read the table rather than keep a second copy of it: a list here is a
    // list that gets forgotten the next time the parser learns an entity.
    const table = readRepoFile('src/lib/research/html-meta.ts');
    const entities = table.match(/'&[a-z#0-9]+;'/g) ?? [];
    assert.ok(entities.length >= 5, "the scan must see the parser's entity table");

    const pages = corpusPages();
    for (const quoted of entities) {
      const entity = quoted.slice(1, -1);
      const decoded = decodeHtmlEntities(entity);
      assert.notEqual(decoded, entity, `${entity} is in the table but decodes to itself`);

      const covering = pages.filter((page) => page.html.includes(entity));
      assert.ok(covering.length > 0, `no page carries ${entity}`);
      assert.ok(
        covering.some(
          (page) =>
            page.title.includes(decoded) || page.description.includes(decoded),
        ),
        `${entity} is carried by a page but no recorded parse holds it decoded`,
      );
    }
  });
});

describe('a page exhibits the shapes it claims', () => {
  for (const page of corpusPages()) {
    it(`${page.name}`, () => {
      for (const shape of page.shapes) {
        assert.ok(
          SHAPE_EVIDENCE[shape](page.html),
          `${page.name} claims ${shape} but the page does not exhibit it`,
        );
      }
    });
  }
});

describe('the description follows the precedence production declares', () => {
  /**
   * The tag reader is production code and shared on purpose. What is under
   * test is the choice between keys, so the choice is made here from the
   * production order and compared against what the parser answered.
   */
  const declaredUnder = (html: string, key: string): string | null => {
    for (const attributes of tagAttributeSets(html, 'meta')) {
      const named = attributes.get('name') ?? attributes.get('property');
      if (named?.toLowerCase() !== key) continue;

      const content = attributes.get('content');
      if (content) return collapseValue(decodeHtmlEntities(content));
    }
    return null;
  };

  it('takes the first key in the production order that a page declares', () => {
    assert.ok(
      DESCRIPTION_META_KEYS.length > 1,
      'a precedence needs at least two keys to be a precedence',
    );

    for (const page of corpusPages()) {
      const byPrecedence =
        DESCRIPTION_META_KEYS.map((key) => declaredUnder(page.html, key)).find(
          (value) => value !== null,
        ) ?? '';
      assert.equal(
        page.description,
        byPrecedence,
        `${page.name} does not match the declared key order`,
      );
    }
  });

  it('is measured by a page that declares more than one of the keys', () => {
    const overlapping = corpusPages().filter(
      (page) =>
        DESCRIPTION_META_KEYS.filter(
          (key) => declaredUnder(page.html, key) !== null,
        ).length > 1,
    );
    assert.ok(
      overlapping.length > 0,
      'no page declares two description keys, so the precedence is unmeasured',
    );
  });
});

describe('nothing outside the head supplies the title', () => {
  // Every icon library ships this markup, and a client-rendered page often has
  // no head title for it to lose to.
  const ICON =
    '<svg viewBox="0 0 24 24" role="img"><title>Menu</title></svg>';

  it('reads the same title with an icon added to the body of every page', () => {
    for (const page of corpusPages()) {
      const withIcon = page.html.replace(/<\/body>/i, `${ICON}</body>`);
      assert.notEqual(
        withIcon,
        page.html,
        `${page.name} has no body for the icon, so the rule would prove nothing`,
      );
      assert.deepEqual(
        {
          title: headTitle(withIcon),
          description: headDescription(withIcon),
        },
        { title: page.title, description: page.description },
      );
    }
  });
});

describe('the corpus covers the inventory and every answer the parser gives', () => {
  it('has a page for every shape the inventory names', () => {
    const claimed = new Set(corpusPages().flatMap((page) => page.shapes));
    for (const shape of PAGE_SHAPES) {
      assert.ok(claimed.has(shape), `no page covers ${shape}`);
    }
  });

  it('keeps the inventory sorted and free of duplicates, so it stays readable', () => {
    const sorted = [...PAGE_SHAPES].sort();
    assert.deepEqual([...PAGE_SHAPES], sorted);
    assert.equal(new Set(PAGE_SHAPES).size, PAGE_SHAPES.length);
  });

  it('measures all four answers a page can produce', () => {
    const answers = corpusPages().map((page) => ({
      title: page.title.length > 0,
      description: page.description.length > 0,
    }));

    // A field the corpus never sees empty is a field whose absent case is
    // measured by nothing, and absence is the common case on a real page.
    for (const wanted of [
      { title: true, description: true },
      { title: true, description: false },
      { title: false, description: true },
      { title: false, description: false },
    ]) {
      assert.ok(
        answers.some(
          (answer) =>
            answer.title === wanted.title &&
            answer.description === wanted.description,
        ),
        `no page answers with title=${wanted.title} and description=${wanted.description}`,
      );
    }
  });
});
