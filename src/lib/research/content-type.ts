/**
 * Content types the HTML extractors can actually read. Anything else fails the
 * source: a JSON error page or a PDF fed to a title regex is not a finding, it
 * is noise that reads as one.
 */
export const RESEARCH_HTML_CONTENT_TYPES = [
  'text/html',
  'application/xhtml+xml',
] as const;

export type ResearchHtmlContentType =
  (typeof RESEARCH_HTML_CONTENT_TYPES)[number];

/**
 * The media type alone, lowercased, with parameters dropped. Null when the
 * header is absent or empty, which is a different fact from an unparseable one.
 */
export function mediaType(header: string | null): string | null {
  if (header === null) return null;
  const type = header.split(';', 1)[0].trim().toLowerCase();
  return type.length === 0 ? null : type;
}

/** True only for a declared HTML media type. A missing header is not HTML. */
export function isHtmlContentType(header: string | null): boolean {
  const type = mediaType(header);
  return (
    type !== null &&
    RESEARCH_HTML_CONTENT_TYPES.some((allowed) => allowed === type)
  );
}
