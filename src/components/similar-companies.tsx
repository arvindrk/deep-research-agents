import { Badge } from '@/components/ui/badge';
import { CompanyCard } from '@/components/company-card';
import type { SimilarCompany } from '@/db/types';
import {
  closenessLabel,
  SIMILAR_COMPANIES_EMPTY_COPY,
  SIMILAR_COMPANIES_FAILED_COPY,
} from '@/lib/similar-companies';
import { cn } from '@/lib/utils';

interface SimilarCompaniesProps {
  /** Nearest first, as findSimilarCompanies returns them. */
  companies: SimilarCompany[];
  /** False when the lookup failed; distinct from success with zero neighbours. */
  loaded: boolean;
}

/**
 * The companies nearest this one, by the same embeddings search ranks with.
 * A reader who finds one interesting company can follow it to the next; a
 * failed lookup says so rather than reading as "nothing is similar".
 */
export function SimilarCompanies({ companies, loaded }: SimilarCompaniesProps) {
  return (
    <section className="space-y-3">
      <h2
        className={cn(
          'text-sm font-medium',
          'text-[var(--color-text-secondary)]'
        )}
      >
        Similar companies
      </h2>

      {!loaded && (
        <p
          className={cn(
            'rounded-md px-3 py-2 text-xs',
            'bg-[var(--color-bg-tertiary)]',
            'text-[var(--color-text-secondary)]'
          )}
        >
          {SIMILAR_COMPANIES_FAILED_COPY}
        </p>
      )}

      {loaded && companies.length === 0 && (
        <p className={cn('text-sm', 'text-[var(--color-text-tertiary)]')}>
          {SIMILAR_COMPANIES_EMPTY_COPY}
        </p>
      )}

      {companies.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {companies.map((company) => (
            <li key={company.id} className="space-y-1">
              <CompanyCard company={company} />
              <Badge variant="secondary" className="text-xs">
                {closenessLabel(company.similarity)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
