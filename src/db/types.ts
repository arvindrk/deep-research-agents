export type Company = {
  id: string;
  source: string;
  source_id: string;
  source_url: string | null;
  name: string;
  slug: string | null;
  website: string | null;
  logo_url: string | null;
  one_liner: string | null;
  long_description: string | null;
  tags: string[];
  industries: string[];
  regions: string[];
  batch: string | null;
  team_size: number | null;
  founded_at: Date | null;
  stage: string | null;
  status: string;
  is_hiring: boolean;
  is_nonprofit: boolean;
  all_locations: string | null;
  source_metadata: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
  last_synced_at: Date;
  embedding?: number[] | null;
};

export type SearchResult = Company & {
  relevance_score: number;
};

/**
 * A query answers with data or with a reason, and never throws. The reason is
 * a string by default, because most callers only render closed copy for it. A
 * query whose caller branches on which reason it got names its own union
 * instead, so a new reason or a typo fails typecheck rather than falling into
 * whichever branch is last.
 */
export type QueryResult<T, E extends string = string> =
  | { success: true; data: T }
  | { success: false; error: E };

export type PaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
};
