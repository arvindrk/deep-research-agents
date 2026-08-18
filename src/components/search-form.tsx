import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { SEARCH_QUERY_PARAM } from '@/lib/search-ui';
import { cn } from '@/lib/utils';

interface SearchFormProps {
  defaultQuery?: string;
}

/**
 * Shareable search: native GET form writes `q` into the URL.
 * No client fetch; the Server Component page re-runs on navigation.
 */
export function SearchForm({ defaultQuery = '' }: SearchFormProps) {
  const hasQuery = defaultQuery.length > 0;

  return (
    <form
      method="get"
      action="/"
      role="search"
      className={cn('mb-8 flex flex-col gap-3 sm:flex-row sm:items-center')}
    >
      <label htmlFor="company-search" className="sr-only">
        Search companies
      </label>
      <input
        id="company-search"
        name={SEARCH_QUERY_PARAM}
        type="search"
        defaultValue={defaultQuery}
        placeholder="Search by name or concept"
        autoComplete="off"
        className={cn(
          'h-10 w-full min-w-0 flex-1 rounded-md border px-3 text-sm outline-none',
          'border-[var(--color-border-primary)]',
          'bg-[var(--color-bg-secondary)]',
          'text-[var(--color-text-primary)]',
          'placeholder:text-[var(--color-text-tertiary)]',
          'focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]'
        )}
      />
      <div className="flex shrink-0 gap-2">
        <Button type="submit">Search</Button>
        {hasQuery ? (
          <Button type="button" variant="outline" asChild>
            <Link href="/">Clear</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}
