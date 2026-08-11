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

export type QueryResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export type PaginatedResult<T> = {
  items: T[];
  nextCursor: string | null;
};
