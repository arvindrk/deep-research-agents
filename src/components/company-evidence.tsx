import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { StoredResearchRun } from '@/db/queries/research';
import {
  buildCompanyResearchPayload,
  toResearchRunDisplayInputs,
} from '@/lib/research/api-payload';
import { fieldLabel } from '@/lib/research/evidence';
import type { Freshness } from '@/lib/research/freshness';
import { cn } from '@/lib/utils';

const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: 'Fresh',
  aging: 'Aging',
  stale: 'Stale',
  unknown: 'Age unknown',
};

interface CompanyEvidenceProps {
  /** Identifies the payload, which the API route serves under the same shape. */
  companyId: string;
  /** Newest-first runs (typically latest plus one prior). */
  researchRuns: StoredResearchRun[];
  /** False when the research history read failed; distinct from success with []. */
  researchHistoryOk: boolean;
  /** Passed in so freshness is decided once per request, not per component. */
  now: Date;
}

/**
 * Enriched claims with the source and the age of each one, so a reader can tell
 * what is known, where it came from, and whether it is still true.
 */
export function CompanyEvidence({
  companyId,
  researchRuns,
  researchHistoryOk,
  now,
}: CompanyEvidenceProps) {
  const payload = buildCompanyResearchPayload({
    companyId,
    runsNewestFirst: toResearchRunDisplayInputs(researchRuns),
    historyLoaded: researchHistoryOk,
    now,
  });
  const { coverage, findings: items, notice, refresh } = payload;

  return (
    <section className="space-y-3">
      <h2
        className={cn(
          'text-sm font-medium',
          'text-[var(--color-text-secondary)]'
        )}
      >
        Research
      </h2>

      {payload.status_label && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {payload.status_label}
          </Badge>
          {payload.observed_at && (
            <time
              dateTime={payload.observed_at}
              className={cn('text-xs', 'text-[var(--color-text-tertiary)]')}
            >
              {payload.observed_at}
            </time>
          )}
        </div>
      )}

      {payload.status_label && (
        <p className={cn('text-xs', 'text-[var(--color-text-secondary)]')}>
          {coverage.summary}{' '}
          {refresh.due_at ? (
            <time
              dateTime={refresh.due_at}
              className="text-[var(--color-text-tertiary)]"
            >
              {refresh.summary}
            </time>
          ) : (
            <span className="text-[var(--color-text-tertiary)]">
              {refresh.summary}
            </span>
          )}
        </p>
      )}

      {payload.status_label && coverage.missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('text-xs', 'text-[var(--color-text-tertiary)]')}>
            Not found
          </span>
          {coverage.missing.map((field) => (
            <Badge key={field} variant="outline" className="text-xs">
              {fieldLabel(field)}
            </Badge>
          ))}
        </div>
      )}

      {notice && (
        <p
          className={cn(
            'rounded-md px-3 py-2 text-xs',
            'bg-[var(--color-bg-tertiary)]',
            'text-[var(--color-text-secondary)]'
          )}
        >
          {notice}
        </p>
      )}

      {payload.empty_state && (
        <p className={cn('text-sm', 'text-[var(--color-text-tertiary)]')}>
          {payload.empty_state}
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => (
          <li key={`${item.field}-${item.observed_at}`} className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'text-sm font-medium',
                  'text-[var(--color-text-primary)]'
                )}
              >
                {item.label}
              </span>
              <Badge variant="secondary" className="text-xs">
                {item.sourceLabel}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {item.confidenceLabel}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {FRESHNESS_LABEL[item.freshness]}
              </Badge>
              {item.freshness === 'unknown' ? (
                <span
                  className={cn('text-xs', 'text-[var(--color-text-tertiary)]')}
                >
                  {item.age}
                </span>
              ) : (
                <time
                  dateTime={item.observed_at}
                  className={cn('text-xs', 'text-[var(--color-text-tertiary)]')}
                >
                  {item.age}
                </time>
              )}
            </div>

            <p className={cn('text-sm', 'text-[var(--color-text-secondary)]')}>
              {item.value}
            </p>

            {item.href && (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-1 text-xs',
                  'text-[var(--color-text-tertiary)]',
                  'hover:text-[var(--color-text-primary)]'
                )}
              >
                Source
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
