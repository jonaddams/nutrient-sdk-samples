"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { SearchViewer } from "./SearchViewer";
import { fetchHits, formatBadgeColor, splitHeadline } from "./lib";
import type { Format, ServerSearchHit } from "./types";

const EXAMPLE_QUERIES = ["toad", "invoice", "chocolate", "consultant"];

export function IndexedSearchServerClient() {
  const [input, setInput] = useState("");
  const [query, setQuery] = useState(""); // committed query
  const [hits, setHits] = useState<ServerSearchHit[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setHits([]);
      setSelectedIdx(null);
      setStatus("idle");
      return;
    }

    // Cancel any in-flight request before issuing a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("loading");
    setErrorMsg(null);
    try {
      const results = await fetchHits(q, controller.signal);
      if (controller.signal.aborted) return;
      setHits(results);
      setSelectedIdx(results.length > 0 ? 0 : null);
      setStatus("idle");
    } catch (err) {
      if (controller.signal.aborted) return;
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "search failed");
    }
  };

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

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
            disabled={status === "loading"}
            loading={status === "loading"}
            onChange={setInput}
            onSubmit={() => search(input)}
          />
          {!query && (
            <ExampleQueries
              terms={EXAMPLE_QUERIES}
              onPick={(q) => {
                setInput(q);
                search(q);
              }}
            />
          )}
          {query && status !== "error" && (
            <div
              className="mt-3 flex items-center justify-between text-sm"
              style={{ color: "var(--ink-3)" }}
            >
              <span>
                {status === "loading"
                  ? "Searching…"
                  : `${hits.length} match${hits.length === 1 ? "" : "es"} for `}
                {status !== "loading" && (
                  <span style={{ color: "var(--ink)" }}>“{query}”</span>
                )}
              </span>
              <button
                type="button"
                className="panel-button"
                onClick={() => {
                  setInput("");
                  setQuery("");
                  setHits([]);
                  setSelectedIdx(null);
                  setStatus("idle");
                }}
              >
                Reset
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {status === "error" && (
            <div className="p-4 text-sm" style={{ color: "var(--danger, #b91c1c)" }}>
              {errorMsg ?? "Search failed."}
            </div>
          )}
          {status === "idle" && query && hits.length === 0 && (
            <div className="p-4 text-sm" style={{ color: "var(--ink-4)" }}>
              No matches across the corpus.
            </div>
          )}
          {renderGroupedHits(hits, selectedIdx, setSelectedIdx)}
        </div>
      </div>

      {/* Viewer area */}
      <div style={{ flex: 1, minWidth: 0, height: "100%" }}>
        {selected ? (
          <SearchViewer
            filename={selected.filename}
            query={query}
            locator={selected.locator}
          />
        ) : (
          <EmptyViewerState />
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SearchInput({
  value,
  disabled,
  loading,
  onChange,
  onSubmit,
}: {
  value: string;
  disabled: boolean;
  loading: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
        disabled={disabled}
        placeholder="Search the server-side index…"
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
          minWidth: 80,
        }}
      >
        {loading ? "…" : "Search"}
      </button>
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
      <p className="text-xs font-medium mb-2" style={{ color: "var(--ink-3)" }}>
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
  hit: ServerSearchHit;
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
      <div
        className="panel-section"
        style={{ padding: 0, color: "var(--accent)", marginBottom: 6 }}
      >
        {hit.unitLabel}
      </div>
      <div
        className="text-sm leading-relaxed"
        style={{ color: "var(--ink-2)" }}
      >
        <HighlightedSnippet snippet={hit.snippet} />
      </div>
    </button>
  );
}

function HighlightedSnippet({ snippet }: { snippet: string }) {
  const parts = splitHeadline(snippet);
  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <mark
            key={i}
            style={{
              background: "var(--accent)",
              color: "var(--bg)",
              padding: "0 2px",
              borderRadius: "var(--r-1)",
            }}
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

/**
 * Renders the result list as file groups: a header per file followed by
 * its hits in score order. Hits arrive already grouped from /api/search,
 * which orders by file-max-score then within-file by score.
 */
function renderGroupedHits(
  hits: ServerSearchHit[],
  selectedIdx: number | null,
  onSelect: (idx: number) => void,
) {
  const nodes: React.ReactNode[] = [];
  let lastFile: string | null = null;

  hits.forEach((hit, idx) => {
    if (hit.filename !== lastFile) {
      lastFile = hit.filename;
      const count = hits.filter((h) => h.filename === hit.filename).length;
      nodes.push(
        <GroupHeader
          key={`hdr-${hit.filename}-${idx}`}
          title={hit.title}
          format={hit.format}
          count={count}
        />,
      );
    }
    nodes.push(
      <ResultRow
        key={hit.id}
        hit={hit}
        active={idx === selectedIdx}
        onClick={() => onSelect(idx)}
      />,
    );
  });
  return <Fragment>{nodes}</Fragment>;
}

function GroupHeader({
  title,
  format,
  count,
}: {
  title: string;
  format: Format;
  count: number;
}) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-4 py-2"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--line)",
        borderTop: "1px solid var(--line)",
        position: "sticky",
        top: 0,
        zIndex: 1,
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <FormatBadge format={format}>{format.toUpperCase()}</FormatBadge>
        <span
          className="text-sm font-medium truncate"
          style={{ color: "var(--ink)" }}
          title={title}
        >
          {title}
        </span>
      </div>
      <span
        className="text-xs font-mono tabular-nums"
        style={{ color: "var(--ink-4)" }}
      >
        {count} {count === 1 ? "hit" : "hits"}
      </span>
    </div>
  );
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

function EmptyViewerState() {
  return (
    <div
      className="flex h-full items-center justify-center text-center px-8"
      style={{ color: "var(--ink-3)" }}
    >
      <div style={{ maxWidth: 480 }}>
        <p className="panel-section" style={{ marginBottom: 8 }}>
          Server-side Cross-Document Search
        </p>
        <p className="text-sm" style={{ color: "var(--ink-2)" }}>
          Enter a query in the sidebar. Each search hits a Postgres-backed{" "}
          <code>/api/search</code> endpoint that returns hits with{" "}
          <code>ts_headline</code>-generated snippets, then loads the matching
          file in the viewer with the term highlighted in place.
        </p>
      </div>
    </div>
  );
}
