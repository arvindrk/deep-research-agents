import { contentChecksum, embeddingTextChecksum } from './checksum';
import type { CompanyContent, SourceCompanyRecord } from './source-record';

/** A company already ingested, as stored. */
export type StoredCompany = CompanyContent & { id: string };

export type RefreshAction = 'insert' | 'update' | 'touch';

export type RefreshDecision = {
  action: RefreshAction;
  reembed: boolean;
  reason: string;
};

/**
 * What one record needs, given what is already stored. `touch` means the record
 * is unchanged and only its sync time moves, which is what makes a re-run of
 * the same page idempotent instead of a second write.
 *
 * Re-embedding is decided separately from updating: most source changes (team
 * size, hiring flag, a canonicalised URL) do not change the embedded text, and
 * embedding is the expensive half of a refresh.
 */
export function decideRefresh(
  stored: StoredCompany | null,
  incoming: SourceCompanyRecord,
): RefreshDecision {
  if (!stored) {
    return { action: 'insert', reembed: true, reason: 'not ingested yet' };
  }

  if (embeddingTextChecksum(stored) !== embeddingTextChecksum(incoming)) {
    return { action: 'update', reembed: true, reason: 'embedded text changed' };
  }

  if (contentChecksum(stored) !== contentChecksum(incoming)) {
    return { action: 'update', reembed: false, reason: 'metadata changed' };
  }

  return { action: 'touch', reembed: false, reason: 'unchanged' };
}
