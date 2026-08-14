"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The overlay counterpart to /web-sdk/search.
 *
 * Same search, same sidebar — the only difference is how a match gets
 * highlighted. /web-sdk/search creates a HighlightAnnotation per click, which
 * writes into the document and then has to be hunted down and deleted again
 * (getAnnotations per page, filter by type, delete each) before the next one
 * can be drawn. Here every match becomes a CustomOverlayItem instead: a plain
 * DOM node the SDK positions in page space. Nothing touches the document, and
 * teardown is one removeCustomOverlayItem(id) per node.
 */

interface ViewerProps {
  document: string | ArrayBuffer;
  exampleSearchTerms?: string[];
}

interface SearchResult {
  id: string;
  pageIndex: number;
  contextSnippet: string;
  locationInPreview: number;
  lengthInPreview: number;
  rects: Array<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>;
}

/**
 * The SDK only mounts an overlay's node while its page is on screen, so a broad
 * term does not put thousands of divs in the document — but we still build a
 * node and register an item per match up front, so a guard is worth having for
 * pathological searches. Set well above what the example terms produce
 * ("Nautilus" is 520 in this book) so a normal demo never trips it. Matches past
 * the cap still list and still navigate, they just aren't painted.
 */
const MAX_OVERLAY_HITS = 2000;

/**
 * Overlay nodes live in the viewer's shadow DOM. Custom properties do inherit
 * across that boundary, so var(--accent) would resolve — but these fills need
 * the accent at two different alphas, which is simpler to read as literals.
 */
const HIT_FILL = "rgba(56, 72, 107, 0.16)";
const ACTIVE_HIT_FILL = "rgba(56, 72, 107, 0.38)";
const ACTIVE_HIT_OUTLINE = "1.5px solid #38486B";

function styleHit(nodes: HTMLDivElement[] | undefined, active: boolean) {
  if (!nodes) {
    return;
  }

  for (const node of nodes) {
    node.style.background = active ? ACTIVE_HIT_FILL : HIT_FILL;
    node.style.outline = active ? ACTIVE_HIT_OUTLINE : "none";
  }
}

export default function SearchOverlayViewer({
  document,
  exampleSearchTerms = [],
}: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);

  /** Every overlay id currently on the page, so teardown is a single pass. */
  const overlayIdsRef = useRef<string[]>([]);
  /** Result index -> its overlay nodes, so the active hit can be restyled. */
  const hitNodesRef = useRef<Map<number, HTMLDivElement[]>>(new Map());

  const [isReady, setIsReady] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastSearchedTerm, setLastSearchedTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState<number | null>(
    null,
  );
  const [overlaidHits, setOverlaidHits] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const { NutrientViewer } = window;

    if (!container || !NutrientViewer) {
      return;
    }

    NutrientViewer.load({
      container,
      document: document,
      allowLinearizedLoading: true,
      pageRendering: "next",
      useCDN: true,
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
    }).then((loadedInstance: Instance) => {
      instanceRef.current = loadedInstance;
      // Exposed so the claim above is checkable from the console mid-demo:
      // `await instance.getAnnotations(55)` stays empty no matter how many
      // matches are highlighted.
      (window as unknown as { instance?: Instance }).instance = loadedInstance;
      setIsReady(true);
    });

    return () => {
      instanceRef.current = null;
      overlayIdsRef.current = [];
      hitNodesRef.current.clear();
      setIsReady(false);
      NutrientViewer.unload(container);
    };
  }, [document]);

  /**
   * Removing overlays is the whole pitch: one call per node, by id. No page
   * scan, no type filtering, no awaiting a document change.
   */
  const clearOverlays = useCallback(() => {
    const instance = instanceRef.current;
    if (!instance) {
      return;
    }

    for (const id of overlayIdsRef.current) {
      instance.removeCustomOverlayItem(id);
    }

    overlayIdsRef.current = [];
    hitNodesRef.current.clear();
  }, []);

  /** Paints one overlay node per rect, for every match up to the cap. */
  const paintOverlays = useCallback((results: SearchResult[]) => {
    const instance = instanceRef.current;
    const { NutrientViewer } = window;

    if (!instance || !NutrientViewer) {
      return 0;
    }

    const ids: string[] = [];
    const nodesByResult = new Map<number, HTMLDivElement[]>();

    const painted = results.slice(0, MAX_OVERLAY_HITS);

    painted.forEach((result, resultIndex) => {
      const nodes: HTMLDivElement[] = [];

      // A single match spanning a line break reports more than one rect, so
      // each match can need more than one overlay node.
      result.rects.forEach((rect, rectIndex) => {
        const node = window.document.createElement("div");

        // Sizes are PDF page units used as px. The SDK scales the node with the
        // page (CustomOverlayItem.disableAutoZoom defaults to false), so the
        // box keeps tracking the text through zoom and rotation.
        node.style.width = `${rect.width}px`;
        node.style.height = `${rect.height}px`;
        node.style.background = HIT_FILL;
        node.style.borderRadius = "2px";
        node.style.boxSizing = "border-box";
        // Let clicks, text selection and the SDK's own tools pass through.
        node.style.pointerEvents = "none";

        const id = `search-hit-${resultIndex}-${rectIndex}`;

        instance.setCustomOverlayItem(
          new NutrientViewer.CustomOverlayItem({
            id,
            node,
            pageIndex: result.pageIndex,
            // position is the node's top-left corner in PDF page space, so a
            // search rect's own left/top drops straight in with no offset.
            position: new NutrientViewer.Geometry.Point({
              x: rect.left,
              y: rect.top,
            }),
          }),
        );

        ids.push(id);
        nodes.push(node);
      });

      nodesByResult.set(resultIndex, nodes);
    });

    overlayIdsRef.current = ids;
    hitNodesRef.current = nodesByResult;

    return painted.length;
  }, []);

  const performSearch = async (termToSearch?: string) => {
    const instance = instanceRef.current;
    const searchQuery = termToSearch || searchTerm;

    if (!instance || !searchQuery.trim()) {
      return;
    }

    if (termToSearch) {
      setSearchTerm(termToSearch);
    }

    clearOverlays();

    setIsSearching(true);
    setSearchResults([]);
    setCurrentResultIndex(null);
    setOverlaidHits(0);

    try {
      const results: SearchResult[] = [];
      const searchResultsIterable = await instance.search(searchQuery);

      searchResultsIterable.forEach((result: any) => {
        const {
          pageIndex,
          previewText,
          locationInPreview,
          lengthInPreview,
          rectsOnPage,
        } = result.toObject();

        if (locationInPreview == null || lengthInPreview == null) {
          return;
        }

        // 125 characters either side of the match, for the sidebar snippet.
        const start = Math.max(0, locationInPreview - 125);
        const end = Math.min(
          previewText.length,
          locationInPreview + lengthInPreview + 125,
        );

        const rectsArray = rectsOnPage ? rectsOnPage.toArray() : [];
        const firstRect = rectsArray[0];

        results.push({
          // Where the match sits on its page — stable across renders, unlike
          // the list index.
          id: `${pageIndex}-${firstRect?.left ?? 0}-${firstRect?.top ?? 0}`,
          pageIndex,
          contextSnippet: previewText.slice(start, end),
          locationInPreview: locationInPreview - start,
          lengthInPreview,
          rects: rectsArray.map((rect: any) => ({
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          })),
        });
      });

      setSearchResults(results);
      setLastSearchedTerm(searchQuery);
      setOverlaidHits(paintOverlays(results));
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const jumpToResult = (index: number) => {
    const instance = instanceRef.current;
    const result = searchResults[index];

    if (!instance || !result) {
      return;
    }

    // Promoting a hit to active is pure DOM work on nodes we already hold: no
    // SDK round-trip, no annotation to create, nothing to delete first.
    styleHit(hitNodesRef.current.get(currentResultIndex ?? -1), false);
    styleHit(hitNodesRef.current.get(index), true);
    setCurrentResultIndex(index);

    instance.setViewState((viewState: any) =>
      viewState.set("currentPageIndex", result.pageIndex),
    );
  };

  const clearSearch = () => {
    clearOverlays();
    setSearchTerm("");
    setLastSearchedTerm("");
    setSearchResults([]);
    setCurrentResultIndex(null);
    setOverlaidHits(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      performSearch();
    }
  };

  const highlightSearchTerm = (text: string, start: number, length: number) => {
    const before = text.slice(0, start);
    const match = text.slice(start, start + length);
    const after = text.slice(start + length);

    return (
      <>
        {before}
        <span
          className="font-semibold px-0.5"
          style={{
            background: "var(--accent)",
            color: "var(--bg)",
            borderRadius: "var(--r-1)",
          }}
        >
          {match}
        </span>
        {after}
      </>
    );
  };

  const searchDisabled = !isReady || isSearching || !searchTerm.trim();

  return (
    <div className="flex h-full">
      {/* Sidebar for search */}
      <div
        className="w-96 flex flex-col"
        style={{
          background: "var(--bg-elev)",
          borderRight: "1px solid var(--line)",
        }}
      >
        {/* Search Input */}
        <div className="p-4" style={{ borderBottom: "1px solid var(--line)" }}>
          <div className="mb-4">
            <label
              htmlFor="search-input"
              className="panel-section"
              style={{
                paddingTop: 0,
                marginBottom: 8,
                display: "block",
              }}
            >
              Search in Document
            </label>
            <div className="flex gap-2">
              <input
                id="search-input"
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setLastSearchedTerm("");
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter search term..."
                className="flex-1 px-3 py-2 focus:outline-none"
                style={{
                  background: "var(--surface)",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-2)",
                  fontSize: "var(--text-sm)",
                }}
                disabled={isSearching}
              />
              <button
                type="button"
                onClick={() => performSearch()}
                disabled={searchDisabled}
                className="px-4 py-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none"
                style={{
                  background: searchDisabled
                    ? "var(--line-strong)"
                    : "var(--accent)",
                  color: "var(--bg)",
                  border: "1px solid transparent",
                  borderRadius: "var(--r-2)",
                }}
              >
                {isSearching ? (
                  <svg
                    className="animate-spin h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <title>Searching...</title>
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <title>Search</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Example Search Terms */}
          {exampleSearchTerms.length > 0 && !searchResults.length && (
            <div className="mb-4">
              <p
                className="text-xs font-medium mb-2"
                style={{ color: "var(--ink-3)" }}
              >
                Try searching for:
              </p>
              <div className="flex flex-wrap gap-2">
                {exampleSearchTerms.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => performSearch(term)}
                    disabled={!isReady || isSearching}
                    className="px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: "var(--surface)",
                      color: "var(--ink-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-pill)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "var(--accent)";
                      e.currentTarget.style.color = "var(--bg)";
                      e.currentTarget.style.borderColor = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "var(--surface)";
                      e.currentTarget.style.color = "var(--ink-2)";
                      e.currentTarget.style.borderColor = "var(--line)";
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {searchResults.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <div className="text-sm" style={{ color: "var(--ink-3)" }}>
                  Found {searchResults.length} result
                  {searchResults.length !== 1 ? "s" : ""}
                </div>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="panel-button"
                >
                  New Search
                </button>
              </div>
              {overlaidHits < searchResults.length && (
                <p className="text-xs mt-2" style={{ color: "var(--ink-4)" }}>
                  {`Highlighting the first ${overlaidHits} of ${searchResults.length} matches — the rest are still listed and still navigate, they just aren't painted.`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto">
          {searchResults.length === 0 && !isSearching && lastSearchedTerm && (
            <div
              className="p-4 text-center text-sm"
              style={{ color: "var(--ink-4)" }}
            >
              No results found for &quot;{lastSearchedTerm}&quot;
            </div>
          )}

          {searchResults.map((result, index) => {
            const isActive = currentResultIndex === index;
            return (
              <button
                key={result.id}
                type="button"
                onClick={() => jumpToResult(index)}
                className="w-full text-left p-4 transition-colors cursor-pointer"
                style={{
                  background: isActive ? "var(--accent-tint)" : "transparent",
                  borderBottom: "1px solid var(--line)",
                  borderLeft: `3px solid ${
                    isActive ? "var(--accent)" : "transparent"
                  }`,
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--accent-tint)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className="panel-section"
                    style={{
                      padding: 0,
                      color: "var(--accent)",
                    }}
                  >
                    Page {result.pageIndex + 1}
                  </span>
                  <span
                    className="text-xs font-mono tabular-nums"
                    style={{ color: "var(--ink-4)" }}
                  >
                    {index + 1} / {searchResults.length}
                  </span>
                </div>
                <div
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--ink-2)" }}
                >
                  {highlightSearchTerm(
                    result.contextSnippet,
                    result.locationInPreview,
                    result.lengthInPreview,
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="p-4 text-xs leading-relaxed"
          style={{
            borderTop: "1px solid var(--line)",
            color: "var(--ink-4)",
          }}
        >
          Matches are highlighted with <code>CustomOverlayItem</code> DOM nodes,
          not annotations — the document is never modified, and nothing is left
          behind on export.
        </div>
      </div>

      {/* Viewer Container */}
      <div
        ref={containerRef}
        style={{ flex: 1, height: "100%", position: "relative" }}
      />
    </div>
  );
}
