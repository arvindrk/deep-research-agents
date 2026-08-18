import { redirect } from 'next/navigation';
import { CompanyGrid } from '@/components/company-grid';
import { CompanyPagination } from '@/components/company-pagination';
import { SearchEmpty } from '@/components/search-empty';
import { SearchError } from '@/components/search-error';
import { SearchForm } from '@/components/search-form';
import { Badge } from '@/components/ui/badge';
import { getCompaniesWithOffset, getCompanyCount, searchCompanies } from '@/db';
import { embedText } from '@/lib/embed';
import { toPublicSearchResults } from '@/lib/hybrid-search-result';
import {
  normalizeSearchQuery,
  resolveSearchSurface,
  SEARCH_UI_LIMIT,
} from '@/lib/search-ui';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

const COMPANIES_PER_PAGE = 24;

interface PageProps {
  searchParams: Promise<{ page?: string; q?: string | string[] }>;
}

function PageShell({
  children,
  query,
  badge,
}: {
  children: ReactNode;
  query: string;
  badge?: string;
}) {
  return (
    <div className={cn('min-h-screen', 'bg-[var(--color-bg-primary)]')}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h1
              className={cn(
                'text-4xl font-semibold',
                'text-[var(--color-text-primary)]'
              )}
            >
              YC Companies
            </h1>
            {badge ? (
              <Badge
                variant="secondary"
                className={cn(
                  'border-none',
                  'bg-[var(--color-bg-tertiary)]',
                  'text-[var(--color-text-secondary)]'
                )}
              >
                {badge}
              </Badge>
            ) : null}
          </div>
          <p className={cn('mb-6 text-base', 'text-[var(--color-text-secondary)]')}>
            Discover companies from Y Combinator&apos;s portfolio
          </p>
          <SearchForm defaultQuery={query} />
        </header>
        {children}
      </div>
    </div>
  );
}

export default async function Home({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const query = normalizeSearchQuery(resolvedParams.q);

  if (query.length > 0) {
    let embedding: number[];
    try {
      embedding = await embedText(query);
    } catch {
      return (
        <PageShell query={query}>
          <SearchError />
        </PageShell>
      );
    }

    const result = await searchCompanies(query, embedding, SEARCH_UI_LIMIT);
    const surface = resolveSearchSurface({
      query,
      status: result.success ? 'ok' : 'error',
      resultCount: result.success ? result.data.length : 0,
    });

    if (surface === 'error') {
      return (
        <PageShell query={query}>
          <SearchError />
        </PageShell>
      );
    }

    if (surface === 'empty') {
      return (
        <PageShell query={query} badge="0 results">
          <SearchEmpty />
        </PageShell>
      );
    }

    const companies = toPublicSearchResults(result.success ? result.data : []);
    return (
      <PageShell
        query={query}
        badge={`${companies.length.toLocaleString()} result${companies.length === 1 ? '' : 's'}`}
      >
        <CompanyGrid companies={companies} />
      </PageShell>
    );
  }

  const page = Number(resolvedParams.page) || 1;
  const countResult = await getCompanyCount();

  if (!countResult.success) {
    return (
      <PageShell query="">
        <div className="py-16 text-center">
          <h2
            className={cn(
              'mb-4 text-2xl font-semibold',
              'text-[var(--color-text-primary)]'
            )}
          >
            Unable to load companies
          </h2>
          <p className={cn('text-[var(--color-text-secondary)]')}>
            Something went wrong while loading companies. Please try again
            later.
          </p>
        </div>
      </PageShell>
    );
  }

  const totalCompanies = countResult.data;
  const totalPages = Math.ceil(totalCompanies / COMPANIES_PER_PAGE);

  if (page < 1 || (totalPages > 0 && page > totalPages)) {
    redirect('/?page=1');
  }

  const offset = (page - 1) * COMPANIES_PER_PAGE;
  const companiesResult = await getCompaniesWithOffset(
    offset,
    COMPANIES_PER_PAGE,
  );

  if (!companiesResult.success) {
    return (
      <PageShell query="">
        <div className="py-16 text-center">
          <h2
            className={cn(
              'mb-4 text-2xl font-semibold',
              'text-[var(--color-text-primary)]'
            )}
          >
            Unable to load companies
          </h2>
          <p className={cn('text-[var(--color-text-secondary)]')}>
            Something went wrong while loading companies. Please try again
            later.
          </p>
        </div>
      </PageShell>
    );
  }

  const companies = companiesResult.data;

  return (
    <PageShell
      query=""
      badge={`${totalCompanies.toLocaleString()} companies`}
    >
      <CompanyGrid companies={companies} />
      {totalPages > 1 ? (
        <div className="mt-12">
          <CompanyPagination currentPage={page} totalPages={totalPages} />
        </div>
      ) : null}
    </PageShell>
  );
}
