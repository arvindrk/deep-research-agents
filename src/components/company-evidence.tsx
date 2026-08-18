import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { toEvidenceItems } from '@/lib/research/evidence';
import type { Freshness } from '@/lib/research/freshness';
import type { ResearchFinding } from '@/lib/research/types';
import { cn } from '@/lib/utils';

const FRESHNESS_LABEL: Record<Freshness, string> = {
  fresh: 'Fresh',
  aging: 'Aging',
  stale: 'Stale',
  unknown: 'Age unknown',
};

interface CompanyEvidenceProps {
  findings: readonly ResearchFinding[];
  /** Passed in so freshness is decided once per request, not per component. */
  now: Date;
}

/**
 * Enriched claims with the source and the age of each one, so a reader can tell
 * what is known, where it came from, and whether it is still true.
 */
export function CompanyEvidence({ findings, now }: CompanyEvidenceProps) {
  const items = toEvidenceItems(findings, now);

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
              <Badge variant="outline" className="text-xs">
                {FRESHNESS_LABEL[item.freshness]}
              </Badge>
              <span className={cn('text-xs', 'text-[var(--color-text-tertiary)]')}>
                {item.age}
              </span>
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
