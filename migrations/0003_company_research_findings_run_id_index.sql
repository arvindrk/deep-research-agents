-- Index findings by research run for detail-page lookups.
--
-- Applied by a human. This repository runs no migrations and the agent loop
-- never touches a database; the file exists so getRecentResearchRuns findings
-- filters (WHERE run_id = $1 or an OR of two run ids) can use an Index or
-- Bitmap scan. Postgres does not create an index on the referencing column
-- of a foreign key, so company_research_findings(run_id) needs this explicitly.
--
-- Non-unique: many findings share one run_id.

CREATE INDEX IF NOT EXISTS company_research_findings_run_id_idx
  ON company_research_findings (run_id);
