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

/** Whitespace collapsed, trimmed, and bounded. Stored and rendered as-is. */
export function collapseValue(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, MAX_FINDING_VALUE_CHARS);
}

const TITLE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const META_DESCRIPTION =
  /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i;

/**
 * Two fields out of a head section, decoded and bounded. Regex rather than a
 * parser: anything it cannot find is simply not a finding, and an empty string
 * says exactly that without a caller having to unwrap a null.
 */
export function headTitle(html: string): string {
  const raw = TITLE.exec(html)?.[1];
  return raw ? collapseValue(decodeHtmlEntities(raw)) : '';
}

export function headDescription(html: string): string {
  const raw = META_DESCRIPTION.exec(html)?.[1];
  return raw ? collapseValue(decodeHtmlEntities(raw)) : '';
}
