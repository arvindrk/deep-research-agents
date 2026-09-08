import { httpUrl } from '../safe-url';
import { tagAttributeSets } from './html-meta';

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
    if (href) return fetched;
  }

  return fetched;
}
