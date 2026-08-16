import { httpUrl } from '../safe-url';

/** The company fields a source owns. Identity is separate; this is content. */
export type CompanyContent = {
  name: string;
  source_url: string | null;
  website: string | null;
  logo_url: string | null;
  one_liner: string | null;
  long_description: string | null;
  tags: string[];
  industries: string[];
  regions: string[];
  batch: string | null;
  stage: string | null;
  status: string;
  team_size: number | null;
  is_hiring: boolean;
  is_nonprofit: boolean;
  all_locations: string | null;
};

/**
 * Every field a source owns, and the only fields a checksum may consider. The
 * wrapper types add `id` or `source_id`; hashing those would make every stored
 * record look different from every incoming one.
 */
export const COMPANY_CONTENT_KEYS = [
  'name',
  'source_url',
  'website',
  'logo_url',
  'one_liner',
  'long_description',
  'tags',
  'industries',
  'regions',
  'batch',
  'stage',
  'status',
  'team_size',
  'is_hiring',
  'is_nonprofit',
  'all_locations',
] as const satisfies readonly (keyof CompanyContent)[];

/** One company as a source describes it, after validation. */
export type SourceCompanyRecord = CompanyContent & {
  source: string;
  source_id: string;
};

export type SourceParseResult =
  | { ok: true; value: SourceCompanyRecord }
  | { ok: false; error: string };

const DEFAULT_STATUS = 'unknown';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Trimmed, de-duplicated, empties dropped. Order is the source's. */
const textList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const entry of value) {
    const item = text(entry);
    if (item) unique.add(item);
  }
  return [...unique];
};

const count = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;

const flag = (value: unknown): boolean => value === true;

/**
 * Source payloads are untrusted input: validated field by field, never cast. A
 * record without an identity or a name is rejected rather than half-ingested,
 * and anything unrecognised is dropped rather than carried through.
 */
export function parseSourceCompany(raw: unknown): SourceParseResult {
  if (!isRecord(raw)) {
    return { ok: false, error: 'record is not an object' };
  }

  const source = text(raw.source);
  const sourceId = text(raw.source_id);
  const name = text(raw.name);

  if (!source) return { ok: false, error: 'source is missing' };
  if (!sourceId) return { ok: false, error: 'source_id is missing' };
  if (!name) return { ok: false, error: 'name is missing' };

  return {
    ok: true,
    value: {
      source,
      source_id: sourceId,
      name,
      source_url: httpUrl(raw.source_url),
      website: httpUrl(raw.website),
      logo_url: httpUrl(raw.logo_url),
      one_liner: text(raw.one_liner),
      long_description: text(raw.long_description),
      tags: textList(raw.tags),
      industries: textList(raw.industries),
      regions: textList(raw.regions),
      batch: text(raw.batch),
      stage: text(raw.stage),
      status: text(raw.status) ?? DEFAULT_STATUS,
      team_size: count(raw.team_size),
      is_hiring: flag(raw.is_hiring),
      is_nonprofit: flag(raw.is_nonprofit),
      all_locations: text(raw.all_locations),
    },
  };
}
