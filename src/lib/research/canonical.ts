import { httpUrl } from '../safe-url';
import { tagAttributeSets } from './html-meta';

/**
 * Canonical hrefs are absolute in practice, and relative ones start at a path.
 * Anything else resolves as a relative reference and produces a same-host URL
 * that never existed: `new URL('ht!tp://%%%', page)` is a path, not an error.
 * A dead link on the right host is worse evidence than the URL we fetched.
 */
function looksLikeUrlReference(href: string): boolean {
  return (
    /^https?:\/\//i.test(href) ||
    href.startsWith('/') ||
    href.startsWith('./') ||
    href.startsWith('../')
  );
}

/**
 * Resolve a declared canonical against the page it came from, and accept it
 * only when it is http(s) on the same host. Same-host is stricter than the
 * specification allows, deliberately: a cross-host canonical would put a
 * reader's only evidence link on a host the collector never visited and the
 * public-destination guard never saw.
 */
function sameHostCanonical(href: string, fetched: string): string | null {
  if (!looksLikeUrlReference(href)) return null;

  let candidate: URL;
  try {
    candidate = new URL(href, fetched);
  } catch {
    return null;
  }

  const safe = httpUrl(candidate.href);
  if (!safe) return null;

  return candidate.hostname.toLowerCase() ===
    new URL(fetched).hostname.toLowerCase()
    ? safe
    : null;
}

/**
 * The URL the page says it is, when a reader can safely be pointed at it.
 *
 * An evidence link is the only way a reader checks a claim, so it has to land
 * somewhere the collector actually went. A page declaring a canonical on
 * another host is not corrected: it is ignored, and the fetched URL wins.
 *
 * Returns null only when the fetched URL itself is unusable, which is how the
 * parse functions already decide there is nothing to attribute.
 */
export function canonicalEvidenceUrl(
  html: string,
  requestUrl: string,
): string | null {
  const fetched = httpUrl(requestUrl);
  if (!fetched) return null;

  for (const attributes of tagAttributeSets(html, 'link')) {
    if (attributes.get('rel')?.trim().toLowerCase() !== 'canonical') continue;

    const href = attributes.get('href');
    if (!href) continue;

    const canonical = sameHostCanonical(href, fetched);
    if (canonical) return canonical;
  }

  return fetched;
}
