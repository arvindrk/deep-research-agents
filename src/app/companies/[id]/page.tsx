import { notFound } from 'next/navigation';
import { CompanyDetail } from '@/components/company-detail';
import { getCompanyById } from '@/db/queries/companies';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const result = await getCompanyById(id);

  if (!result.success) {
    if (result.error === 'Company not found') {
      notFound();
    }

    return (
      <div className={cn('min-h-screen', 'bg-[var(--color-bg-primary)]')}>
        <div className="mx-auto max-w-3xl px-4 py-16">
          <div className="text-center">
            <h1
              className={cn(
                'mb-4 text-2xl font-semibold',
                'text-[var(--color-text-primary)]'
              )}
            >
              Unable to load company
            </h1>
            <p className={cn('text-[var(--color-text-secondary)]')}>
              Something went wrong while loading this profile. Please try again
              later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <CompanyDetail company={result.data} />;
}
