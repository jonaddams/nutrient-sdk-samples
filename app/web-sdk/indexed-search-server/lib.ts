import type { Format, SearchApiResponse, ServerSearchHit } from "./types";

export async function fetchHits(
  query: string,
  signal?: AbortSignal,
): Promise<ServerSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(trimmed)}&limit=50`,
    { signal },
  );
  if (!res.ok) {
    throw new Error(`search request failed (${res.status})`);
  }
  const body: SearchApiResponse = await res.json();
  if (body.error) throw new Error(body.error);
  return body.hits;
}

/**
 * ts_headline returns the snippet with literal [[mark]]…[[/mark]] markers
 * around matched terms. Parse them into segments the React renderer can
 * map over without dangerously setting innerHTML.
 */
export function splitHeadline(snippet: string): Array<{ text: string; match: boolean }> {
  const out: Array<{ text: string; match: boolean }> = [];
  const re = /\[\[mark\]\]([\s\S]*?)\[\[\/mark\]\]/g;
  let cursor = 0;
  for (const m of snippet.matchAll(re)) {
    const start = m.index ?? 0;
    if (start > cursor) out.push({ text: snippet.slice(cursor, start), match: false });
    out.push({ text: m[1], match: true });
    cursor = start + m[0].length;
  }
  if (cursor < snippet.length) out.push({ text: snippet.slice(cursor), match: false });
  return out;
}

export function formatBadgeColor(format: Format): { bg: string; fg: string } {
  switch (format) {
    case "pdf":  return { bg: "#fee2e2", fg: "#991b1b" };
    case "docx": return { bg: "#dbeafe", fg: "#1e40af" };
    case "xlsx": return { bg: "#dcfce7", fg: "#166534" };
    case "pptx": return { bg: "#fef3c7", fg: "#92400e" };
  }
}
