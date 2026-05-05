"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type MiniSearch from "minisearch";
import { SearchViewer } from "./SearchViewer";
import { formatBadgeColor, loadIndex, runQuery } from "./lib";
import type { Format, IndexUnit, ManifestEntry, SearchHit } from "./types";

const EXAMPLE_QUERIES = ["toad", "invoice", "chocolate", "consultant"];

export function IndexedSearchClient() {
  const [ms, setMs] = useState<MiniSearch<IndexUnit> | null>(null);
  const [manifest, setManifest] = useState<ManifestEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [query, setQuery] = useState(""); // committed query (after Enter / button)
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    loadIndex()
      .then(({ ms, manifest }) => {
        setMs(ms);
        setManifest(manifest);
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  const formatCounts = useMemo(() => {
    const counts: Record<Format, number> = { pdf: 0, docx: 0, xlsx: 0, pptx: 0 };
    for (const m of manifest) counts[m.format] += 1;
    return counts;
  }, [manifest]);

  const search = (q: string) => {
    setQuery(q);
    if (!ms) return;
    const results = runQuery(ms, q);
    setHits(results);
    setSelectedIdx(results.length > 0 ? 0 : null);
  };

  const selected = selectedIdx != null ? hits[selectedIdx] : null;

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div
        className="flex flex-col"
        style={{
          width: 420,
          background: "var(--bg-elev)",
          borderRight: "1px solid var(--line)",
        }}
      >
        <div className="p-4" style={{ borderBottom: "1px solid var(--line)" }}>
          <SearchInput
            value={input}
            disabled={!ms}
            onChange={setInput}
            onSubmit={() => search(input)}
          />
          {!query && manifest.length > 0 && (
            <CorpusSummary manifest={manifest} counts={formatCounts} />
          )}
          {!query && manifest.length > 0 && (
            <ExampleQueries
              terms={EXAMPLE_QUERIES}
              onPick={(q) => {
                setInput(q);
                search(q);
              }}
            />
          )}
          {query && (
            <div
              className="mt-3 flex items-center justify-between text-sm"
              style={{ color: "var(--ink-3)" }}
            >
              <span>
                {hits.length} match{hits.length === 1 ? "" : "es"} for{" "}
                <span style={{ color: "var(--ink)" }}>“{query}”</span>
              </span>
              <button
                type="button"
                className="panel-button"
                onClick={() => {
                  setInput("");
                  setQuery("");
                  setHits([]);
                  setSelectedIdx(null);
                }}
              >
                Reset
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadError && (
            <div className="p-4 text-sm" style={{ color: "var(--danger, #b91c1c)" }}>
              {loadError}
            </div>
          )}
          {!ms && !loadError && (
            <div className="p-4 text-sm" style={{ color: "var(--ink-4)" }}>
              Loading index…
            </div>
          )}
          {ms && query && hits.length === 0 && (
            <div className="p-4 text-sm" style={{ color: "var(--ink-4)" }}>
              No matches across the corpus.
            </div>
          )}
          {hits.map((hit, idx) => (
            <ResultRow
              key={hit.unit.id}
              hit={hit}
              active={idx === selectedIdx}
              onClick={() => setSelectedIdx(idx)}
            />
          ))}
        </div>
      </div>

      {/* Viewer area */}
      <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
        {selected ? (
          <SearchViewer
            filename={selected.unit.filename}
            query={query}
            locator={selected.unit.locator}
          />
        ) : (
          <EmptyViewerState ready={ms != null} />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SearchInput({
  value,
  disabled,
  onChange,
  onSubmit,
}: {
  value: string;
  disabled: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="flex gap-2">
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
        disabled={disabled}
        placeholder="Search across the indexed corpus…"
        className="flex-1 px-3 py-2 focus:outline-none"
        style={{
          background: "var(--surface)",
          color: "var(--ink)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-2)",
          fontSize: "var(--text-sm)",
        }}
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className="px-4 py-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: !value.trim() ? "var(--line-strong)" : "var(--accent)",
          color: "var(--bg)",
          border: "1px solid transparent",
          borderRadius: "var(--r-2)",
        }}
      >
        Search
      </button>
    </div>
  );
}

function CorpusSummary({
  manifest,
  counts,
}: {
  manifest: ManifestEntry[];
  counts: Record<Format, number>;
}) {
  const totalUnits = manifest.reduce((acc, m) => acc + m.unitCount, 0);
  return (
    <div className="mt-4">
      <p className="panel-section" style={{ paddingTop: 0, marginBottom: 6 }}>
        Indexed Corpus
      </p>
      <p className="text-xs" style={{ color: "var(--ink-3)" }}>
        {manifest.length} files · {totalUnits.toLocaleString()} indexed units
      </p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {(["pdf", "docx", "xlsx", "pptx"] as Format[]).map((f) =>
          counts[f] === 0 ? null : (
            <FormatBadge key={f} format={f}>
              {counts[f]} {f.toUpperCase()}
            </FormatBadge>
          ),
        )}
      </div>
    </div>
  );
}

function ExampleQueries({
  terms,
  onPick,
}: {
  terms: string[];
  onPick: (q: string) => void;
}) {
  return (
    <div className="mt-4">
      <p
        className="text-xs font-medium mb-2"
        style={{ color: "var(--ink-3)" }}
      >
        Try a query:
      </p>
      <div className="flex flex-wrap gap-2">
        {terms.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onPick(t)}
            className="px-3 py-1.5 text-xs font-medium cursor-pointer"
            style={{
              background: "var(--surface)",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-pill)",
            }}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultRow({
  hit,
  active,
  onClick,
}: {
  hit: SearchHit;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 transition-colors cursor-pointer"
      style={{
        background: active ? "var(--accent-tint)" : "transparent",
        borderBottom: "1px solid var(--line)",
        borderLeft: `3px solid ${active ? "var(--accent)" : "transparent"}`,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--accent-tint)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <FormatBadge format={hit.unit.format}>
          {hit.unit.format.toUpperCase()}
        </FormatBadge>
        <span
          className="text-xs flex-1 truncate"
          style={{ color: "var(--ink-2)", textAlign: "right" }}
          title={hit.unit.title}
        >
          {hit.unit.title}
        </span>
      </div>
      <div
        className="panel-section"
        style={{ padding: 0, color: "var(--accent)", marginBottom: 6 }}
      >
        {hit.unit.unitLabel}
      </div>
      <div
        className="text-sm leading-relaxed"
        style={{ color: "var(--ink-2)" }}
      >
        <HighlightedSnippet snippet={hit.snippet} matches={hit.matches} />
      </div>
    </button>
  );
}

function HighlightedSnippet({
  snippet,
  matches,
}: {
  snippet: string;
  matches: Array<{ start: number; length: number }>;
}) {
  if (matches.length === 0) return <>{snippet}</>;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  matches.forEach((m, i) => {
    if (m.start > cursor) parts.push(snippet.slice(cursor, m.start));
    parts.push(
      <mark
        key={i}
        style={{
          background: "var(--accent)",
          color: "var(--bg)",
          padding: "0 2px",
          borderRadius: "var(--r-1)",
        }}
      >
        {snippet.slice(m.start, m.start + m.length)}
      </mark>,
    );
    cursor = m.start + m.length;
  });
  if (cursor < snippet.length) parts.push(snippet.slice(cursor));
  return <>{parts}</>;
}

function FormatBadge({
  format,
  children,
}: {
  format: Format;
  children: React.ReactNode;
}) {
  const { bg, fg } = formatBadgeColor(format);
  return (
    <span
      className="text-xs font-mono font-semibold tracking-wide px-2 py-0.5"
      style={{
        background: bg,
        color: fg,
        borderRadius: "var(--r-1)",
        flexShrink: 0,
      }}
    >
      {children}
    </span>
  );
}

function EmptyViewerState({ ready }: { ready: boolean }) {
  return (
    <div
      className="flex h-full items-center justify-center text-center px-8"
      style={{ color: "var(--ink-3)" }}
    >
      <div style={{ maxWidth: 480 }}>
        <p className="panel-section" style={{ marginBottom: 8 }}>
          Cross-document Search
        </p>
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          {ready
            ? "Enter a query in the sidebar. Click any result to load that file in the viewer with the term highlighted in place."
            : "Loading the prebuilt search index…"}
        </p>
      </div>
    </div>
  );
}
