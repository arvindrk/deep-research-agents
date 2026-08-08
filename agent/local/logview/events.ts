export type HarnessEvent = {
  ts: string;
  run_id: string;
  seq: number;
  type: string;
  [field: string]: unknown;
};

const isEvent = (value: unknown): value is HarnessEvent => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.ts === 'string' &&
    typeof candidate.run_id === 'string' &&
    typeof candidate.type === 'string' &&
    typeof candidate.seq === 'number'
  );
};

/**
 * Parses a JSONL event stream, discarding anything malformed.
 *
 * The writer is a shell script emitting best-effort lines while a run is in
 * flight, so a truncated final line is normal rather than exceptional. Losing
 * one line must never cost the whole stream.
 */
export function parseEvents(jsonl: string): HarnessEvent[] {
  const events: HarnessEvent[] = [];

  for (const line of jsonl.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (isEvent(parsed)) events.push(parsed);
    } catch {
      // Truncated or interleaved write; skip it.
    }
  }

  return events.sort((a, b) => a.ts.localeCompare(b.ts) || a.seq - b.seq);
}

export const field = (event: HarnessEvent | undefined, name: string): string =>
  event && event[name] !== undefined ? String(event[name]) : '';

export const numeric = (event: HarnessEvent | undefined, name: string): number => {
  const value = event?.[name];
  return typeof value === 'number' ? value : 0;
};
