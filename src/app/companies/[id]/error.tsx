'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
          <p className={cn('mb-8', 'text-[var(--color-text-secondary)]')}>
            Something went wrong while loading this profile. Please try again.
          </p>
          <Button type="button" onClick={reset}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
