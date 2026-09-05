import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import type { StoredResearchRun } from '@/db/queries/research';
import { toEvidenceItems } from '@/lib/research/evidence';
import type { Freshness } from '@/lib/research/freshness';
import {
  researchRunNoticeCopy,
  researchRunStatusLabel,
} from '@/lib/research/run-summary';
import { cn } from '@/lib/utils';

const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: 'Fresh',
  aging: 'Aging',
  stale: 'Stale',
  unknown: 'Age unknown',
};

interface CompanyEvidenceProps {
  research: StoredResearchRun | null;
  /** Passed in so freshness is decided once per request, not per component. */
  now: Date;
}

/**
 * Enriched claims with the source and the age of each one, so a reader can tell
 * what is known, where it came from, and whether it is still true.
 */
export function CompanyEvidence({ research, now }: CompanyEvidenceProps) {
  const items = research ? toEvidenceItems(research.findings, now) : [];
  const missing = research?.failed.map((failure) => failure.source) ?? [];
  const notice = research
    ? researchRunNoticeCopy(research.status, missing)
    : null;

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

      {research && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {researchRunStatusLabel(research.status)}
          </Badge>
          <time
            dateTime={research.observed_at}
            className={cn('text-xs', 'text-[var(--color-text-tertiary)]')}
          >
            {research.observed_at}
          </time>
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

      {items.length === 0 && (
        <p className={cn('text-sm', 'text-[var(--color-text-tertiary)]')}>
          {research
            ? 'The last research run found nothing to report for this company.'
            : 'No research has run for this company yet.'}
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
