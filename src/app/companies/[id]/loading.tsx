import { cn } from '@/lib/utils';

export default function Loading() {
  return (
    <div className={cn('min-h-screen', 'bg-[var(--color-bg-primary)]')}>
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div
          className={cn(
            'mb-8 h-4 w-32 animate-pulse rounded',
            'bg-[var(--color-bg-tertiary)]'
          )}
        />

        <div
          className={cn(
            'rounded-lg border p-6',
            'border-[var(--color-border-primary)]',
            'bg-[var(--color-bg-secondary)]'
          )}
          aria-busy="true"
          aria-label="Loading company"
        >
          <div className="mb-6 flex items-start gap-4">
            <div
              className={cn(
                'h-16 w-16 shrink-0 animate-pulse rounded-lg',
                'bg-[var(--color-bg-tertiary)]'
              )}
            />
            <div className="min-w-0 flex-1 space-y-3">
              <div
                className={cn(
                  'h-8 w-2/3 animate-pulse rounded',
                  'bg-[var(--color-bg-tertiary)]'
                )}
              />
              <div
                className={cn(
                  'h-4 w-full animate-pulse rounded',
                  'bg-[var(--color-bg-tertiary)]'
                )}
              />
              <div
                className={cn(
                  'h-4 w-4/5 animate-pulse rounded',
                  'bg-[var(--color-bg-tertiary)]'
                )}
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <div
              className={cn(
                'h-6 w-20 animate-pulse rounded-full',
                'bg-[var(--color-bg-tertiary)]'
              )}
            />
            <div
              className={cn(
                'h-6 w-24 animate-pulse rounded-full',
                'bg-[var(--color-bg-tertiary)]'
              )}
            />
            <div
              className={cn(
                'h-6 w-16 animate-pulse rounded-full',
                'bg-[var(--color-bg-tertiary)]'
              )}
            />
          </div>

          <div className="space-y-2">
            <div
              className={cn(
                'h-4 w-full animate-pulse rounded',
                'bg-[var(--color-bg-tertiary)]'
              )}
            />
            <div
              className={cn(
                'h-4 w-full animate-pulse rounded',
                'bg-[var(--color-bg-tertiary)]'
              )}
            />
            <div
              className={cn(
                'h-4 w-3/4 animate-pulse rounded',
                'bg-[var(--color-bg-tertiary)]'
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
