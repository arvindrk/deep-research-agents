const ALLOWED = new Set(['text/html', 'application/xhtml+xml']);

/**
 * Reject non-HTML research responses before body read / HTML parse.
 * Media type only (ignore parameters); missing or empty Content-Type fails.
 */
export function assertHtmlResearchContentType(
  contentType: string | null,
): void {
  if (contentType == null || contentType.trim() === '') {
    throw new Error('Research response missing Content-Type');
  }

  const mediaType = contentType.split(';', 1)[0]!.trim().toLowerCase();
  if (!ALLOWED.has(mediaType)) {
    throw new Error(
      `Research response Content-Type must be HTML, got ${mediaType}`,
    );
  }
}
