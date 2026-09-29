import type { ExtractionListItem } from "./types";

/**
 * What "the list" means, shared by the list page and the detail pager.
 *
 * Prev/next on the detail page walks the list *as the reader filtered it*, so
 * both routes must match rows identically. The filter travels between them in
 * the URL (`?status=…&q=…`) rather than in memory: it survives a reload, and a
 * filtered view is a link you can send someone.
 */

export const ALL = "All";

export interface ListFilter {
  /** An extraction status, or ALL. */
  status: string;
  q: string;
}

export function filterFromParams(params: URLSearchParams): ListFilter {
  return {
    status: params.get("status") || ALL,
    q: params.get("q") ?? "",
  };
}

/** `?status=…&q=…`, or "" for the unfiltered list so plain URLs stay plain. */
export function filterToQuery(f: ListFilter): string {
  const params = new URLSearchParams();
  if (f.status !== ALL) params.set("status", f.status);
  if (f.q.trim()) params.set("q", f.q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function matchesFilter(row: ExtractionListItem, f: ListFilter): boolean {
  if (f.status !== ALL && row.status !== f.status) return false;
  const q = f.q.trim().toLowerCase();
  if (!q) return true;
  // Search the extracted values too, not just the envelope — finding an
  // invoice by its number or vendor is the reason you would search here.
  const haystack = [
    row.from_address,
    row.subject,
    ...Object.values(row.extracted_data ?? {}).map((v) =>
      typeof v === "object" ? "" : String(v ?? ""),
    ),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export interface Neighbours {
  /** Zero-based position within the filtered list. */
  index: number;
  total: number;
  prevId: string | null;
  nextId: string | null;
}

/**
 * Where `id` sits in the filtered list. Null when it is not in it — a direct
 * link to a row the filter excludes — so the pager hides rather than guessing.
 */
export function neighbours(
  rows: ExtractionListItem[],
  id: string,
  f: ListFilter,
): Neighbours | null {
  const list = rows.filter((r) => matchesFilter(r, f));
  const index = list.findIndex((r) => r.id === id);
  if (index === -1) return null;
  return {
    index,
    total: list.length,
    prevId: list[index - 1]?.id ?? null,
    nextId: list[index + 1]?.id ?? null,
  };
}
