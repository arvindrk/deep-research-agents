/**
 * Company ids are text. `migrations/0001_company_research.sql` says plainly
 * that nothing in this repository asserts the type of `companies.id`, and the
 * research tables key on text for that reason, so a uuid check here would
 * reject ids that are valid on somebody's database.
 *
 * What can honestly be required of a route parameter is a bounded, non-empty,
 * single-line string.
 */
export const MAX_COMPANY_ID_CHARS = 64;

export type CompanyIdParseResult =
  | { ok: true; value: string }
  | { ok: false; error: 'invalid_company_id' };

const INVALID: CompanyIdParseResult = { ok: false, error: 'invalid_company_id' };

/** A control character in a route parameter is never part of an id. */
function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

export function parseCompanyId(raw: unknown): CompanyIdParseResult {
  if (typeof raw !== 'string') return INVALID;

  const value = raw.trim();
  if (value.length === 0 || value.length > MAX_COMPANY_ID_CHARS) return INVALID;
  if (hasControlCharacter(value)) return INVALID;

  return { ok: true, value };
}
