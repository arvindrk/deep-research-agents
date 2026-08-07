import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getPageSlots, type PageSlot } from '@/lib/pagination-model';

const numbersIn = (slots: PageSlot[]) => slots.filter((slot): slot is number => slot !== 'ellipsis');

describe('getPageSlots', () => {
  it('lists every page while they all fit', () => {
    assert.deepEqual(getPageSlots(1, 1), [1]);
    assert.deepEqual(getPageSlots(3, 7), [1, 2, 3, 4, 5, 6, 7]);
  });

  it('returns nothing when there are no pages', () => {
    assert.deepEqual(getPageSlots(1, 0), []);
  });

  it('windows around the current page once they do not fit', () => {
    assert.deepEqual(getPageSlots(1, 10), [1, 2, 'ellipsis', 10]);
    assert.deepEqual(getPageSlots(5, 10), [1, 'ellipsis', 4, 5, 6, 'ellipsis', 10]);
    assert.deepEqual(getPageSlots(10, 10), [1, 'ellipsis', 9, 10]);
  });

  it('opens the leading ellipsis only once page 3 is passed', () => {
    assert.deepEqual(getPageSlots(3, 10), [1, 2, 3, 4, 'ellipsis', 10]);
    assert.deepEqual(getPageSlots(4, 10), [1, 'ellipsis', 3, 4, 5, 'ellipsis', 10]);
  });

  it('closes the trailing ellipsis as the end comes into view', () => {
    assert.deepEqual(getPageSlots(7, 10), [1, 'ellipsis', 6, 7, 8, 'ellipsis', 10]);
    assert.deepEqual(getPageSlots(8, 10), [1, 'ellipsis', 7, 8, 9, 10]);
  });

  it('holds its invariants across every page of every size', () => {
    for (let totalPages = 1; totalPages <= 30; totalPages++) {
      for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        const slots = getPageSlots(currentPage, totalPages);
        const where = `page ${currentPage} of ${totalPages}`;
        const pages = numbersIn(slots);

        assert.equal(slots.at(0), 1, `${where}: must start at page 1`);
        assert.equal(slots.at(-1), totalPages, `${where}: must end at the last page`);
        assert.ok(pages.includes(currentPage), `${where}: must include the current page`);
        assert.deepEqual(pages, [...new Set(pages)], `${where}: must not repeat a page`);
        assert.deepEqual(pages, [...pages].sort((a, b) => a - b), `${where}: must ascend`);
        assert.ok(slots.length <= 7, `${where}: must stay within 7 slots, got ${slots.length}`);
        assert.ok(
          !slots.some((slot, i) => slot === 'ellipsis' && slots[i + 1] === 'ellipsis'),
          `${where}: must not place two ellipses side by side`,
        );
        assert.ok(
          pages.every((page) => page >= 1 && page <= totalPages),
          `${where}: must stay in range`,
        );
      }
    }
  });
});
