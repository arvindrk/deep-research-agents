-- Unique identity for a company as known by one ingestion source.
--
-- Applied by a human. This repository runs no migrations and the agent loop
-- never touches a database; the file exists so insertCompanyFromSource's
-- ON CONFLICT (source, source_id) target is reviewable before anything is applied.
--
-- Before apply: confirm no duplicate (source, source_id) rows exist, e.g.
--   SELECT source, source_id, COUNT(*) FROM companies
--   GROUP BY source, source_id HAVING COUNT(*) > 1;
-- A unique index create fails if duplicates are present.

CREATE UNIQUE INDEX IF NOT EXISTS companies_source_source_id_uidx
  ON companies (source, source_id);
