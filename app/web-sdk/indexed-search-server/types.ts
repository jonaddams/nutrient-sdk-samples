import type { Format, Locator } from "@/app/web-sdk/indexed-search/types";

export type { Format, Locator };

/**
 * One match returned by GET /api/search. Snippet contains [[mark]]…[[/mark]]
 * markers around terms that matched the query (output of Postgres'
 * ts_headline). The client splits on those markers to render highlights.
 */
export interface ServerSearchHit {
  id: string;
  filename: string;
  format: Format;
  title: string;
  unitLabel: string;
  locator: Locator;
  snippet: string;
  score: number;
}

export interface SearchApiResponse {
  hits: ServerSearchHit[];
  error?: string;
}
