/** Cards show a bounded tag set so long tag lists cannot break the layout. */
export const DISPLAY_TAG_LIMIT = 3;

/** The tags a card renders, in source order. */
export function pickDisplayTags(
  tags: readonly string[],
  limit: number = DISPLAY_TAG_LIMIT,
): string[] {
  return tags.slice(0, Math.max(0, limit));
}

/** How many tags the card does not render. */
export function overflowTagCount(
  tags: readonly string[],
  limit: number = DISPLAY_TAG_LIMIT,
): number {
  return Math.max(0, tags.length - Math.max(0, limit));
}

/** Badge label for the hidden tags, or null when every tag is visible. */
export function overflowTagLabel(
  tags: readonly string[],
  limit: number = DISPLAY_TAG_LIMIT,
): string | null {
  const hidden = overflowTagCount(tags, limit);
  return hidden > 0 ? `+${hidden}` : null;
}
