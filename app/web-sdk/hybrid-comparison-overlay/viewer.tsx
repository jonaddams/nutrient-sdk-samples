"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { extractReplacements, type ReplacementChange } from "./changes";

const DOC_A = "/documents/hybrid-comparison-a.pdf";
const DOC_B = "/documents/hybrid-comparison-b.pdf";
const PAGE_W = 612;
const PAGE_H = 792;

const BLEND_MODES = ["darken", "multiply", "difference"];
const OLD_COLOR = "#c0392b";
const NEW_COLOR = "#1a8f3c";

export function HybridComparisonOverlayViewer() {
  const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY;
  // Comparison-overlay instance (Rev A base) is the main viewer; a headless
  // helper computes the text diff (the comparison instance can't). Our own
  // <div> markers float in a layer over the viewer, re-positioned each frame
  // from the rendered page rect — the SDK overlay API doesn't work in
  // comparison mode, so we position the divs ourselves.
  const viewerRef = useRef<HTMLDivElement>(null);
  const markerLayerRef = useRef<HTMLDivElement>(null);
  const comparisonInstance = useRef<Instance | null>(null);
  const helperInstance = useRef<Instance | null>(null);
  const markerEls = useRef<Map<string, HTMLButtonElement | null>>(new Map());
  const changesRef = useRef<ReplacementChange[]>([]);
  const rafRef = useRef<number>(0);
  const didInit = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<ReplacementChange[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [blendMode, setBlendMode] = useState("darken");

  // Rendered page rect (relative to the marker layer), or null if not found.
  function getPageRect() {
    const inst = comparisonInstance.current;
    const layer = markerLayerRef.current;
    if (!inst || !layer) return null;
    let doc: Document | null = null;
    try {
      doc = inst.contentDocument as unknown as Document;
    } catch {
      return null;
    }
    if (!doc) return null;
    const pageEl =
      doc.querySelector(".PSPDFKit-Page") ||
      doc.querySelector("[data-page-index]") ||
      doc.querySelector(".PSPDFKit-Scroll");
    if (!pageEl) return null;
    const frameEl = doc.defaultView?.frameElement as HTMLElement | null;
    const pr = pageEl.getBoundingClientRect();
    const fr = frameEl
      ? frameEl.getBoundingClientRect()
      : ({ left: 0, top: 0 } as DOMRect);
    const lr = layer.getBoundingClientRect();
    return {
      left: fr.left + pr.left - lr.left,
      top: fr.top + pr.top - lr.top,
      width: pr.width,
      height: pr.height,
    };
  }

  // Re-position every marker from the live page rect. Runs each animation frame
  // so markers stay glued through zoom, pan, and scroll.
  function positionMarkers() {
    const rect = getPageRect();
    const sx = rect ? rect.width / PAGE_W : 0;
    const sy = rect ? rect.height / PAGE_H : 0;
    for (const c of changesRef.current) {
      const el = markerEls.current.get(c.id);
      if (!el) continue;
      if (!rect) {
        el.style.display = "none";
        continue;
      }
      const x = rect.left + (c.rect[0] + c.rect[2] / 2) * sx;
      const y = rect.top + c.rect[1] * sy;
      el.style.display = "";
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
    }
    rafRef.current = requestAnimationFrame(positionMarkers);
  }

  async function applyVisualOverlay(page: number, blend: string) {
    const NV = window.NutrientViewer;
    if (!NV || !comparisonInstance.current) return;
    await comparisonInstance.current.setDocumentComparisonMode({
      documentA: {
        source: NV.DocumentComparisonSourceType.USE_OPEN_DOCUMENT,
        pageIndex: page,
      },
      documentB: { source: DOC_B, pageIndex: page },
      blendMode: blend as never,
      autoCompare: true,
    });
  }

  async function runTextComparison(page: number) {
    const NV = window.NutrientViewer;
    const helper = helperInstance.current;
    if (!NV || !helper) return;
    const op = new NV.ComparisonOperation(NV.ComparisonOperationType.TEXT, {
      numberOfContextWords: 100,
    });
    const result = await helper.compareDocuments(
      {
        originalDocument: new NV.DocumentDescriptor({
          filePath: DOC_A,
          pageIndexes: [page],
        }),
        changedDocument: new NV.DocumentDescriptor({
          filePath: DOC_B,
          pageIndexes: [page],
        }),
      },
      op,
    );
    const list = extractReplacements(result, page);
    changesRef.current = list;
    setChanges(list);
    setSelectedId(null);
  }

  // Scroll the comparison view so the change is vertically centered. The
  // overlay doesn't expose a scroll API, so we drive its scroll container
  // directly and let the rAF loop re-pin the markers.
  function scrollToChange(c: ReplacementChange) {
    const inst = comparisonInstance.current;
    if (!inst) return;
    let doc: Document | null = null;
    try {
      doc = inst.contentDocument as unknown as Document;
    } catch {
      return;
    }
    if (!doc) return;
    const scrollEl = doc.querySelector(
      ".PSPDFKit-Scroll",
    ) as HTMLElement | null;
    const page = (doc.querySelector(".PSPDFKit-Page") ||
      doc.querySelector("[data-page-index]")) as HTMLElement | null;
    if (!scrollEl || !page) return;
    const pageRect = page.getBoundingClientRect();
    const scrollRect = scrollEl.getBoundingClientRect();
    const scale = pageRect.height / PAGE_H;
    const changeY = pageRect.top + (c.rect[1] + c.rect[3] / 2) * scale;
    const centerY = scrollRect.top + scrollEl.clientHeight / 2;
    scrollEl.scrollTo({
      top: scrollEl.scrollTop + (changeY - centerY),
      behavior: "smooth",
    });
  }

  function selectChange(c: ReplacementChange) {
    setSelectedId(c.id);
    scrollToChange(c);
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: one-time init (guarded by didInit); helpers use refs only
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    async function waitForSDK() {
      for (let i = 0; i < 100; i++) {
        if (window.NutrientViewer) return window.NutrientViewer;
        await new Promise((r) => setTimeout(r, 100));
      }
      throw new Error("Nutrient Web SDK failed to load");
    }

    async function init() {
      try {
        const NV = await waitForSDK();
        const container = viewerRef.current;
        if (!container) return;
        comparisonInstance.current = await NV.load({
          container,
          document: DOC_A,
          useCDN: true,
          licenseKey,
        });
        helperInstance.current = await NV.load({
          document: DOC_B,
          useCDN: true,
          licenseKey,
          headless: true,
        });
        setPageCount(comparisonInstance.current.totalPageCount);
        await applyVisualOverlay(0, "darken");
        await runTextComparison(0);
        setLoading(false);
        rafRef.current = requestAnimationFrame(positionMarkers);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    }

    init();

    return () => {
      cancelAnimationFrame(rafRef.current);
      const NV = window.NutrientViewer;
      if (NV && viewerRef.current) NV.unload(viewerRef.current);
      if (NV && helperInstance.current) NV.unload(helperInstance.current);
      comparisonInstance.current = null;
      helperInstance.current = null;
    };
  }, [licenseKey]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs only on page/blend
  useEffect(() => {
    if (loading) return;
    applyVisualOverlay(pageIndex, blendMode);
    runTextComparison(pageIndex);
  }, [pageIndex, blendMode]);

  if (error) {
    return (
      <div style={{ padding: 16, color: "#c0392b" }}>
        Failed to load: {error}
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      {loading && <LoadingSpinner message="Loading comparison…" />}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: "8px 4px",
        }}
      >
        <label style={{ fontSize: 13 }}>
          Page{" "}
          <select
            value={pageIndex}
            onChange={(e) => setPageIndex(Number(e.target.value))}
            disabled={loading}
          >
            {Array.from({ length: pageCount }, (_, i) => i).map((p) => (
              <option key={p} value={p}>
                {p + 1}
              </option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 13 }}>
          Blend{" "}
          <select
            value={blendMode}
            onChange={(e) => setBlendMode(e.target.value)}
            disabled={loading}
          >
            {BLEND_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <span style={{ fontSize: 12, color: "#666" }}>
          Visual comparison with custom &lt;div&gt; change markers
        </span>
      </div>
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 360px)",
          minHeight: 560,
          border: "1px solid #e0e0ea",
        }}
      >
        {/* Viewer + marker overlay layer */}
        <div
          style={{
            flex: 1,
            position: "relative",
            borderRight: "1px solid #e0e0ea",
          }}
        >
          <div ref={viewerRef} style={{ width: "100%", height: "100%" }} />
          <div
            ref={markerLayerRef}
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            {changes.map((c) => (
              <button
                type="button"
                key={c.id}
                ref={(el) => {
                  markerEls.current.set(c.id, el);
                }}
                onClick={() => selectChange(c)}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  transform: "translate(-50%, calc(-100% - 6px))",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "2px 8px",
                  borderRadius: 999,
                  border: `1px solid ${selectedId === c.id ? "#6c5ce7" : "#d0d0da"}`,
                  background: "#fff",
                  boxShadow: `0 1px 4px rgba(0,0,0,${selectedId === c.id ? 0.28 : 0.16})`,
                  font: "600 11px ui-sans-serif,system-ui,sans-serif",
                  whiteSpace: "nowrap",
                  cursor: "pointer",
                  pointerEvents: "auto",
                }}
              >
                {c.kind === "replace" ? (
                  <>
                    <span
                      style={{
                        color: OLD_COLOR,
                        textDecoration: "line-through",
                      }}
                    >
                      {c.oldText}
                    </span>
                    <span style={{ color: "#888" }}>→</span>
                    <span style={{ color: NEW_COLOR }}>{c.newText}</span>
                  </>
                ) : c.kind === "insert" ? (
                  <span style={{ color: NEW_COLOR }}>+ {c.newText}</span>
                ) : (
                  <span
                    style={{ color: OLD_COLOR, textDecoration: "line-through" }}
                  >
                    − {c.oldText}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        {/* Changes sidebar */}
        <div style={{ width: 260, overflowY: "auto", padding: 12 }}>
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              color: "#666",
              marginBottom: 8,
            }}
          >
            Text changes ({changes.length})
          </div>
          {changes.length === 0 ? (
            <div style={{ fontSize: 13, color: "#888" }}>
              No text changes on this page.
            </div>
          ) : (
            changes.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => selectChange(c)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  marginBottom: 4,
                  borderRadius: 4,
                  border: "1px solid #e0e0ea",
                  background: selectedId === c.id ? "#eef0ff" : "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {c.kind === "replace" ? (
                  <>
                    <span
                      style={{
                        color: OLD_COLOR,
                        textDecoration: "line-through",
                      }}
                    >
                      {c.oldText}
                    </span>{" "}
                    <span style={{ color: "#888" }}>→</span>{" "}
                    <span style={{ color: NEW_COLOR, fontWeight: 600 }}>
                      {c.newText}
                    </span>
                  </>
                ) : c.kind === "insert" ? (
                  <span style={{ color: NEW_COLOR, fontWeight: 600 }}>
                    + {c.newText}
                  </span>
                ) : (
                  <span
                    style={{ color: OLD_COLOR, textDecoration: "line-through" }}
                  >
                    − {c.oldText}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
