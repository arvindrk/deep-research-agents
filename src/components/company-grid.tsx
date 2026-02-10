'use client';

import * as React from 'react';
import { CompanyCard } from './company-card';
import { cn } from '@/lib/utils';
import type { Company } from '@/db/types';

interface CompanyGridProps {
  companies: Company[];
}

export function CompanyGrid({ companies }: CompanyGridProps) {
  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className={cn(
            'rounded-full p-6 mb-4',
            'bg-[var(--color-bg-tertiary)]'
          )}
        >
          <svg
            className={cn('w-8 h-8', 'text-[var(--color-text-tertiary)]')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <h3
          className={cn(
            'text-lg font-medium mb-2',
            'text-[var(--color-text-primary)]'
          )}
        >
          No companies found
        </h3>
        <p className={cn('text-[var(--color-text-secondary)]')}>
          Check back later for new additions.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid gap-4 lg:gap-6',
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      )}
    >
      {companies.map((company) => (
        <CompanyCard key={company.id} company={company} />
      ))}
    </div>
  );
}
