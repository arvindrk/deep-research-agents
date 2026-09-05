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
