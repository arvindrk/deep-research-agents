/**
 * Whether the runtime can actually ask every source it declares. A source in
 * RESEARCH_SOURCES with no collector is never attempted, so it never appears in
 * a run's `attempted` list and never makes a run partial: it simply is not
 * there, which is the one failure mode the run record cannot express.
 */
export type CollectorCoverage = {
  /** Declared sources that have exactly one collector. */
  covered: string[];
  /** Declared sources with no collector. Silently never attempted. */
  missing: string[];
  /** Sources claimed by more than one collector. */
  duplicated: string[];
  /** Collector sources that are not declared in RESEARCH_SOURCES. */
  undeclared: string[];
};

export function collectorCoverage(
  sources: readonly string[],
  collectors: readonly { source: string }[],
): CollectorCoverage {
  const counts = new Map<string, number>();
  for (const collector of collectors) {
    counts.set(collector.source, (counts.get(collector.source) ?? 0) + 1);
  }

  return {
    covered: sources.filter((source) => counts.get(source) === 1),
    missing: sources.filter((source) => !counts.has(source)),
    duplicated: sources.filter((source) => (counts.get(source) ?? 0) > 1),
    undeclared: [...counts.keys()].filter(
      (source) => !sources.includes(source),
    ),
  };
}
