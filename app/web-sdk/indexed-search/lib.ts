import MiniSearch from "minisearch";
import type { Format, IndexUnit, ManifestEntry, SearchHit } from "./types";

let cached: { ms: MiniSearch<IndexUnit>; manifest: ManifestEntry[] } | null = null;
let loading: Promise<{ ms: MiniSearch<IndexUnit>; manifest: ManifestEntry[] }> | null = null;

const SEARCH_OPTS = {
  boost: { title: 3, unitLabel: 2 },
  prefix: true,
  // Fuzzy intentionally off: MiniSearch's edit-distance fuzzy returns hits
  // whose unit text doesn't actually contain the query (e.g. "consultant"
  // matches "constant"). Nutrient's in-document search is exact, so those
  // false positives can't be highlighted in the viewer and dump the user
  // on page 1. Prefix matching alone covers the common "I typed half the
  // word" case without the false-positive cost.
  combineWith: "AND" as const,
};

export async function loadIndex() {
  if (cached) return cached;
  if (loading) return loading;
  loading = (async () => {
    const [indexRes, manifestRes] = await Promise.all([
      fetch("/search-index/index.json"),
      fetch("/search-index/manifest.json"),
    ]);
    if (!indexRes.ok || !manifestRes.ok) {
      throw new Error("Failed to load search index — run `pnpm index`");
    }
    const indexJson = await indexRes.json();
    const manifest: ManifestEntry[] = await manifestRes.json();
    const ms = MiniSearch.loadJS<IndexUnit>(indexJson, {
      idField: "id",
      fields: ["title", "unitLabel", "text"],
      storeFields: ["filename", "format", "title", "unitLabel", "locator", "text"],
      searchOptions: SEARCH_OPTS,
    });
    cached = { ms, manifest };
    return cached;
  })();
  return loading;
}

export function runQuery(ms: MiniSearch<IndexUnit>, query: string, max = 50): SearchHit[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const results = ms.search(trimmed).slice(0, max);
  const terms = tokenize(trimmed);

  return results.map((r) => {
    const unit: IndexUnit = {
      id: r.id as string,
      filename: r.filename,
      format: r.format,
      title: r.title,
      unitLabel: r.unitLabel,
      locator: r.locator,
      text: r.text ?? "",
    };
    const { snippet, matches } = buildSnippet(unit.text, terms);
    return { unit, score: r.score, snippet, matches };
  });
}

export function tokenize(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[\s,;.!?]+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2),
    ),
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildSnippet(
  text: string,
  terms: string[],
  windowSize = 140,
): { snippet: string; matches: Array<{ start: number; length: number }> } {
  if (terms.length === 0) {
    return { snippet: truncate(text, windowSize * 2), matches: [] };
  }

  const lower = text.toLowerCase();
  let firstIdx = -1;
  let firstLen = 0;
  for (const t of terms) {
    const idx = lower.indexOf(t);
    if (idx >= 0 && (firstIdx === -1 || idx < firstIdx)) {
      firstIdx = idx;
      firstLen = t.length;
    }
  }

  if (firstIdx < 0) {
    return { snippet: truncate(text, windowSize * 2), matches: [] };
  }

  const start = Math.max(0, firstIdx - windowSize);
  const end = Math.min(text.length, firstIdx + firstLen + windowSize);
  const slice = text.slice(start, end);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  const snippet = prefix + slice + suffix;

  const matches: Array<{ start: number; length: number }> = [];
  const snippetLower = snippet.toLowerCase();
  for (const t of terms) {
    const re = new RegExp(escapeRegex(t), "g");
    for (const m of snippetLower.matchAll(re)) {
      matches.push({ start: m.index ?? 0, length: t.length });
    }
  }
  matches.sort((a, b) => a.start - b.start);
  const deduped: typeof matches = [];
  for (const m of matches) {
    const prev = deduped[deduped.length - 1];
    if (!prev || m.start >= prev.start + prev.length) deduped.push(m);
  }
  return { snippet, matches: deduped };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export function formatBadgeColor(format: Format): { bg: string; fg: string } {
  switch (format) {
    case "pdf":  return { bg: "#fee2e2", fg: "#991b1b" };
    case "docx": return { bg: "#dbeafe", fg: "#1e40af" };
    case "xlsx": return { bg: "#dcfce7", fg: "#166534" };
    case "pptx": return { bg: "#fef3c7", fg: "#92400e" };
  }
}
