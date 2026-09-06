/** A source that hangs is a source that failed, so requests carry a bound. */
export const RESEARCH_FETCH_TIMEOUT_MS = 5_000;

/** Long enough to be useful as evidence, short enough to store and render. */
export const MAX_FINDING_VALUE_CHARS = 300;

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

/**
 * One pass, so nothing is unescaped twice: replacing `&amp;` first would turn
 * `&amp;lt;` into `<`, which is text the page had deliberately escaped.
 */
export function decodeHtmlEntities(value: string): string {
  return value.replace(
    /&(?:amp|lt|gt|quot|#39);/g,
    (entity) => ENTITIES[entity] ?? entity,
  );
}
