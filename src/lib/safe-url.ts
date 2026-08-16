/**
 * Returns the URL only when it is http or https. Source payloads and rendered
 * hrefs both need this: a `javascript:` or `data:` URL from a source is a
 * script waiting for a click.
 */
export function httpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}
