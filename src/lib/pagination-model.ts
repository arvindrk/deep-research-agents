export type PageSlot = number | 'ellipsis';

const MAX_VISIBLE = 7;

/**
 * Page slots for a windowed pagination control: always the first and last page,
 * the current page with one neighbour either side, and ellipses across any gap.
 */
export function getPageSlots(currentPage: number, totalPages: number): PageSlot[] {
  if (totalPages <= MAX_VISIBLE) {
    return Array.from({ length: Math.max(totalPages, 0) }, (_, i) => i + 1);
  }

  const slots: PageSlot[] = [1];

  if (currentPage > 3) slots.push('ellipsis');

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let page = start; page <= end; page++) slots.push(page);

  if (currentPage < totalPages - 2) slots.push('ellipsis');

  slots.push(totalPages);
  return slots;
}
