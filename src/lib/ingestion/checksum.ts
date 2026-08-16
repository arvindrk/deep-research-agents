import { createHash } from 'node:crypto';

import { buildCompanyEmbeddingText } from '../company-embedding';
import type { CompanyContent } from './source-record';

/**
 * Order-independent canonical form: two sources that list the same tags in a
 * different order describe the same company, and should not look like a change.
 */
function canonical(content: CompanyContent): string {
  const entries = Object.entries(content)
    .map(([key, value]): [string, unknown] => [
      key,
      Array.isArray(value) ? [...value].sort() : value,
    ])
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));

  return JSON.stringify(entries);
}

const sha256 = (input: string): string =>
  createHash('sha256').update(input).digest('hex');

/** Changes when anything a source owns changes. Decides update versus skip. */
export function contentChecksum(content: CompanyContent): string {
  return sha256(canonical(content));
}

/**
 * Changes only when the text that gets embedded changes, because it is a hash
 * of exactly that text. Decides whether a refresh has to spend an embedding.
 */
export function embeddingTextChecksum(content: CompanyContent): string {
  return sha256(buildCompanyEmbeddingText(content));
}
