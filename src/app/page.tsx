import { redirect } from 'next/navigation';
import { CompanyGrid } from '@/components/company-grid';
import { CompanyPagination } from '@/components/company-pagination';
import { Badge } from '@/components/ui/badge';
import { getCompaniesWithOffset, getCompanyCount } from '@/db';
import { cn } from '@/lib/utils';

const COMPANIES_PER_PAGE = 24;

interface PageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function Home({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const page = Number(resolvedParams.page) || 1;

  const countResult = await getCompanyCount();

  if (!countResult.success) {
    return (
      <div className={cn('min-h-screen', 'bg-[var(--color-bg-primary)]')}>
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="text-center">
            <h1
              className={cn(
                'mb-4 text-2xl font-semibold',
                'text-[var(--color-text-primary)]'
              )}
            >
              Unable to load companies
            </h1>
            <p className={cn('text-[var(--color-text-secondary)]')}>
              Something went wrong while loading companies. Please try again
              later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalCompanies = countResult.data;
  const totalPages = Math.ceil(totalCompanies / COMPANIES_PER_PAGE);

  if (page < 1 || page > totalPages) {
    redirect('/?page=1');
  }

  const offset = (page - 1) * COMPANIES_PER_PAGE;
  const companiesResult = await getCompaniesWithOffset(offset, COMPANIES_PER_PAGE);

  if (!companiesResult.success) {
    return (
      <div className={cn('min-h-screen', 'bg-[var(--color-bg-primary)]')}>
        <div className="mx-auto max-w-7xl px-4 py-16">
          <div className="text-center">
            <h1
              className={cn(
                'mb-4 text-2xl font-semibold',
                'text-[var(--color-text-primary)]'
              )}
            >
              Unable to load companies
            </h1>
            <p className={cn('text-[var(--color-text-secondary)]')}>
              Something went wrong while loading companies. Please try again
              later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const companies = companiesResult.data;

  return (
    <div className={cn('min-h-screen', 'bg-[var(--color-bg-primary)]')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h1
              className={cn(
                'text-4xl font-semibold',
                'text-[var(--color-text-primary)]'
              )}
            >
              YC Companies
            </h1>
            <Badge
              variant="secondary"
              className={cn(
                'bg-[var(--color-bg-tertiary)]',
                'text-[var(--color-text-secondary)]',
                'border-none'
              )}
            >
              {totalCompanies.toLocaleString()} companies
            </Badge>
          </div>
          <p className={cn('text-base', 'text-[var(--color-text-secondary)]')}>
            Discover companies from Y Combinator&apos;s portfolio
          </p>
        </header>

        {/* Company Grid */}
        <CompanyGrid companies={companies} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12">
            <CompanyPagination currentPage={page} totalPages={totalPages} />
          </div>
        )}
      </div>
    </div>
  );
}
