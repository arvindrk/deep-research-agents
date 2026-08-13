import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DISPLAY_TAG_LIMIT,
  overflowTagCount,
  overflowTagLabel,
  pickDisplayTags,
} from '@/lib/company-tags';

const tags = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `tag-${index}`);

describe('pickDisplayTags', () => {
  it('never returns more than the display limit', () => {
    for (let count = 0; count <= 12; count += 1) {
      assert.ok(pickDisplayTags(tags(count)).length <= DISPLAY_TAG_LIMIT);
    }
  });

  it('keeps source order', () => {
    assert.deepEqual(pickDisplayTags(['b', 'a', 'c', 'd']), ['b', 'a', 'c']);
  });
});

describe('overflowTagCount', () => {
  it('counts exactly the tags the card hides', () => {
    for (let count = 0; count <= 12; count += 1) {
      const shown = pickDisplayTags(tags(count)).length;
      assert.equal(overflowTagCount(tags(count)) + shown, count);
    }
  });
});

describe('overflowTagLabel', () => {
  it('is null while every tag is visible', () => {
    assert.equal(overflowTagLabel(tags(DISPLAY_TAG_LIMIT)), null);
  });

  it('reports the hidden count once tags overflow', () => {
    assert.equal(overflowTagLabel(tags(DISPLAY_TAG_LIMIT + 4)), '+4');
  });
});
