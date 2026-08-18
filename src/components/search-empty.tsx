import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SEARCH_UI_COPY } from '@/lib/search-ui';
import { cn } from '@/lib/utils';

export function SearchEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h3
        className={cn(
          'mb-2 text-lg font-medium',
          'text-[var(--color-text-primary)]'
        )}
      >
        {SEARCH_UI_COPY.emptyTitle}
      </h3>
      <p className={cn('mb-6 max-w-md', 'text-[var(--color-text-secondary)]')}>
        {SEARCH_UI_COPY.emptyDescription}
      </p>
      <Button type="button" variant="outline" asChild>
        <Link href="/">Browse all companies</Link>
      </Button>
    </div>
  );
}
