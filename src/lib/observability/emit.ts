import type { ResearchEvent } from './research-event';
import type { SearchEvent } from './search-event';

/**
 * One JSON line per event, so a log pipeline can parse it without a shipper
 * config. This is the only I/O in the observability module; everything that
 * decides what an event says stays pure and evaluable.
 */
export function emitSearchEvent(event: SearchEvent): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}

/** Same one-line JSON shape as search; research builders stay pure. */
export function emitResearchEvent(event: ResearchEvent): void {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}
