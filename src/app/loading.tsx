import { cn } from '@/lib/utils';

function SkeletonCard() {
  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-lg border p-6',
        'border-[var(--color-border-primary)]',
        'bg-[var(--color-bg-secondary)]'
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className={cn(
            'h-12 w-12 shrink-0 animate-pulse rounded',
            'bg-[var(--color-bg-tertiary)]'
          )}
        />
        <div
          className={cn(
            'h-5 w-2/3 animate-pulse rounded',
            'bg-[var(--color-bg-tertiary)]'
          )}
        />
      </div>
      <div
        className={cn(
          'mb-2 h-4 w-full animate-pulse rounded',
          'bg-[var(--color-bg-tertiary)]'
        )}
      />
      <div
        className={cn(
          'mb-4 h-4 w-4/5 animate-pulse rounded',
          'bg-[var(--color-bg-tertiary)]'
        )}
      />
      <div className="mt-auto flex gap-2">
        <div
          className={cn(
            'h-6 w-16 animate-pulse rounded-full',
            'bg-[var(--color-bg-tertiary)]'
          )}
        />
        <div
          className={cn(
            'h-6 w-14 animate-pulse rounded-full',
            'bg-[var(--color-bg-tertiary)]'
          )}
        />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className={cn('min-h-screen', 'bg-[var(--color-bg-primary)]')}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <header className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <div
              className={cn(
                'h-10 w-48 animate-pulse rounded',
                'bg-[var(--color-bg-tertiary)]'
              )}
            />
            <div
              className={cn(
                'h-6 w-28 animate-pulse rounded-full',
                'bg-[var(--color-bg-tertiary)]'
              )}
            />
          </div>
          <div
            className={cn(
              'h-4 w-80 max-w-full animate-pulse rounded',
              'bg-[var(--color-bg-tertiary)]'
            )}
          />
        </header>

        <div
          className={cn(
            'grid gap-4 lg:gap-6',
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          )}
          aria-busy="true"
          aria-label="Loading companies"
        >
          {Array.from({ length: 8 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
