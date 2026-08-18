import { SEARCH_UI_COPY } from '@/lib/search-ui';
import { cn } from '@/lib/utils';

export function SearchError() {
  return (
    <div className="py-16 text-center">
      <h2
        className={cn(
          'mb-4 text-2xl font-semibold',
          'text-[var(--color-text-primary)]'
        )}
      >
        {SEARCH_UI_COPY.errorTitle}
      </h2>
      <p className={cn('text-[var(--color-text-secondary)]')}>
        {SEARCH_UI_COPY.errorDescription}
      </p>
    </div>
  );
}
