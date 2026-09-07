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

/**
 * Description keys in precedence order. A page that declares both gets the one
 * it wrote for search engines, not the one it wrote for link previews.
 */
export const DESCRIPTION_META_KEYS = ['description', 'og:description'] as const;

const META_TAG = /<meta\b[^>]*>/gi;
const META_ATTR = /([a-zA-Z0-9:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

/** A meta tag's attributes, lowercased keys, quoted values. */
function metaAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  META_ATTR.lastIndex = 0;
  for (
    let match = META_ATTR.exec(tag);
    match !== null;
    match = META_ATTR.exec(tag)
  ) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? '');
  }
  return attributes;
}

/**
 * The content of the first meta tag whose `name` or `property` is `key`.
 * Attributes are read as a set rather than matched in sequence, because real
 * pages write `content` before `property` about as often as after it.
 */
export function metaContent(html: string, key: string): string {
  META_TAG.lastIndex = 0;
  for (
    let tag = META_TAG.exec(html);
    tag !== null;
    tag = META_TAG.exec(html)
  ) {
    const attributes = metaAttributes(tag[0]);
    const declared = attributes.get('name') ?? attributes.get('property');
    if (declared?.toLowerCase() !== key) continue;

    const content = attributes.get('content');
    if (content) return collapseValue(decodeHtmlEntities(content));
  }
  return '';
}

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
  for (const key of DESCRIPTION_META_KEYS) {
    const value = metaContent(html, key);
    if (value) return value;
  }
  return '';
}
