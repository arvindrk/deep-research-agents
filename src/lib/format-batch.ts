const SEASON_ABBREVIATIONS: Record<string, string> = {
  Winter: 'W',
  Summer: 'S',
  Fall: 'F',
  Spring: 'X',
};

const BATCH_PATTERN = /^(Winter|Summer|Fall|Spring)\s+(\d{4})$/;

/** Renders a YC batch as its short form, e.g. "Winter 2024" to "W24". */
export function formatBatch(batch: string): string {
  const match = batch.match(BATCH_PATTERN);
  if (!match) return batch;

  const [, season, year] = match;
  return `${SEASON_ABBREVIATIONS[season]}${year.slice(-2)}`;
}
