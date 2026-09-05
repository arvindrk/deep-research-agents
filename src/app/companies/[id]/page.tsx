import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CompanyDetail } from '@/components/company-detail';
import { getCompanyById } from '@/db/queries/companies';
import { getRecentResearchRuns } from '@/db/queries/research';
import { cn } from '@/lib/utils';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await getCompanyById(id);

  if (!result.success) {
    return { title: 'Company' };
  }

  return {
    title: result.data.name,
    description: result.data.one_liner ?? undefined,
  };
}

export default async function CompanyDetailPage({ params }: PageProps) {
  const { id } = await params;

  // Independent reads: the research query does not need the company row, so
  // waiting for one before starting the other would just add a round trip.
  const [result, research] = await Promise.all([
    getCompanyById(id),
    getRecentResearchRuns(id),
  ]);

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

  // Profile still renders when research history fails; the section must show a
  // load-failure state, not collapse that into "never researched".
  return (
    <CompanyDetail
      company={result.data}
      researchRuns={research.success ? research.data : []}
      researchHistoryOk={research.success}
    />
  );
}
