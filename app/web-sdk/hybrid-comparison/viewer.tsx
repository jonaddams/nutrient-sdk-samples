"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { ChangesRail } from "./ChangesRail";
import { type ChangeEntry, extractChanges } from "./changes";

const DOC_A = "/documents/hybrid-comparison-a.pdf";
const DOC_B = "/documents/hybrid-comparison-b.pdf";

const BLEND_MODES = ["darken", "multiply", "difference"];
const INSERT_COLOR = "#ffe066"; // changed-document highlights (text added)
const ORIGINAL_COLOR = "#ffb3b3"; // original-document highlights (text changed)

const ANNOTATION_TOOLBAR = [
  { type: "pan" },
  { type: "zoom-out" },
  { type: "zoom-in" },
  { type: "highlighter" },
  { type: "note" },
  { type: "ink" },
  { type: "rectangle" },
];

type ViewMode = "overlay" | "original" | "changed";

export function HybridComparisonViewer() {
  const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY;
  // Three stacked instances, one visible at a time (toggled by `visibility`):
  //  - overlay:  Rev A in the SDK's visual comparison mode (composited overlay)
  //  - original: Rev A as a normal viewer, highlighting the text that changed
  //  - changed:  Rev B as a normal viewer, highlighting the text that was added
  // The overlay can't render annotations, so the highlights live on the two
  // normal viewers. The changed instance also runs the text diff.
  const overlayRef = useRef<HTMLDivElement>(null);
  const originalRef = useRef<HTMLDivElement>(null);
  const changedRef = useRef<HTMLDivElement>(null);
  const overlayInstance = useRef<Instance | null>(null);
  const originalInstance = useRef<Instance | null>(null);
  const changedInstance = useRef<Instance | null>(null);
  const originalAnnotationIds = useRef<string[]>([]);
  const changedAnnotationIds = useRef<string[]>([]);
  const didInit = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [changes, setChanges] = useState<ChangeEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [markupCount, setMarkupCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [blendMode, setBlendMode] = useState("darken");
  const [viewMode, setViewMode] = useState<ViewMode>("overlay");

  // Put the overlay instance into the SDK's native visual comparison mode.
  async function applyVisualOverlay(page: number, blend: string) {
    const NV = window.NutrientViewer;
    if (!NV || !overlayInstance.current) return;
    await overlayInstance.current.setDocumentComparisonMode({
      documentA: {
        source: NV.DocumentComparisonSourceType.USE_OPEN_DOCUMENT,
        pageIndex: page,
      },
      documentB: { source: DOC_B, pageIndex: page },
      blendMode: blend as never,
      autoCompare: true,
    });
  }

  // Compute the text diff and highlight each change on the matching normal
  // viewer: inserts on the changed document, the original text that changed on
  // the original document. Both render because they're normal viewers.
  async function runTextComparison(page: number) {
    const NV = window.NutrientViewer;
    const original = originalInstance.current;
    const changed = changedInstance.current;
    if (!NV || !original || !changed) return;

    if (originalAnnotationIds.current.length) {
      await Promise.all(
        originalAnnotationIds.current.map((id) =>
          original.delete(id).catch(() => {}),
        ),
      );
      originalAnnotationIds.current = [];
    }
    if (changedAnnotationIds.current.length) {
      await Promise.all(
        changedAnnotationIds.current.map((id) =>
          changed.delete(id).catch(() => {}),
        ),
      );
      changedAnnotationIds.current = [];
    }

    const op = new NV.ComparisonOperation(NV.ComparisonOperationType.TEXT, {
      numberOfContextWords: 100,
    });
    const originalDocument = new NV.DocumentDescriptor({
      filePath: DOC_A,
      pageIndexes: [page],
    });
    const changedDocument = new NV.DocumentDescriptor({
      filePath: DOC_B,
      pageIndexes: [page],
    });
    const result = await changed.compareDocuments(
      { originalDocument, changedDocument },
      op,
    );

    const extracted = extractChanges(result, page);

    // Inserts carry coordinates in the changed document; deletes carry
    // coordinates in the original document. Highlight each on its own viewer.
    const createdOriginal: string[] = [];
    const createdChanged: string[] = [];
    for (const c of extracted) {
      const rect = new NV.Geometry.Rect({
        left: c.rect[0],
        top: c.rect[1],
        width: c.rect[2],
        height: c.rect[3],
      });
      const target = c.type === "insert" ? changed : original;
      const annotation = new NV.Annotations.HighlightAnnotation({
        pageIndex: page,
        rects: NV.Immutable.List([rect]),
        boundingBox: rect,
        color: NV.Color.fromHex(
          c.type === "insert" ? INSERT_COLOR : ORIGINAL_COLOR,
        ),
      });
      const res = await target.create(annotation);
      const id =
        Array.isArray(res) && res[0] ? (res[0] as { id: string }).id : null;
      if (id) {
        c.id = id; // tie the rail entry to its annotation for navigation
        if (c.type === "insert") createdChanged.push(id);
        else createdOriginal.push(id);
      }
    }
    originalAnnotationIds.current = createdOriginal;
    changedAnnotationIds.current = createdChanged;
    setChanges(extracted);
    setSelectedId(null);
  }

  // Select a change: flip to the view that holds its highlight and scroll to it.
  function handleSelect(c: ChangeEntry) {
    setSelectedId(c.id);
    const NV = window.NutrientViewer;
    const target =
      c.type === "insert" ? changedInstance.current : originalInstance.current;
    setViewMode(c.type === "insert" ? "changed" : "original");
    if (!NV || !target) return;
    target.setViewState(target.viewState.set("currentPageIndex", c.pageIndex));
    target.jumpToRect(
      c.pageIndex,
      new NV.Geometry.Rect({
        left: c.rect[0],
        top: c.rect[1],
        width: c.rect[2],
        height: c.rect[3],
      }),
    );
  }

  // Reviewer markup on whichever document view is active (the overlay can't
  // render annotations, so markup from the overlay tab lands on the changed doc).
  async function addMarkup() {
    const NV = window.NutrientViewer;
    const target =
      viewMode === "original"
        ? originalInstance.current
        : changedInstance.current;
    if (!NV || !target) return;
    if (viewMode === "overlay") setViewMode("changed");
    const note = new NV.Annotations.RectangleAnnotation({
      pageIndex,
      boundingBox: new NV.Geometry.Rect({
        left: 60,
        top: 60,
        width: 160,
        height: 90,
      }),
      strokeColor: NV.Color.RED,
      strokeWidth: 3,
    });
    const res = await target.create(note);
    if (Array.isArray(res) && res.length) {
      setMarkupCount((n) => n + res.length);
    }
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
        const overlayContainer = overlayRef.current;
        const originalContainer = originalRef.current;
        const changedContainer = changedRef.current;
        if (!overlayContainer || !originalContainer || !changedContainer)
          return;
        overlayInstance.current = await NV.load({
          container: overlayContainer,
          document: DOC_A,
          useCDN: true,
          licenseKey,
        });
        originalInstance.current = await NV.load({
          container: originalContainer,
          document: DOC_A,
          useCDN: true,
          licenseKey,
          toolbarItems: ANNOTATION_TOOLBAR as never,
        });
        changedInstance.current = await NV.load({
          container: changedContainer,
          document: DOC_B,
          useCDN: true,
          licenseKey,
          toolbarItems: ANNOTATION_TOOLBAR as never,
        });
        setPageCount(overlayInstance.current.totalPageCount);
        await applyVisualOverlay(0, "darken");
        await runTextComparison(0);
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    }

    init();

    return () => {
      const NV = window.NutrientViewer;
      if (NV && overlayRef.current) NV.unload(overlayRef.current);
      if (NV && originalRef.current) NV.unload(originalRef.current);
      if (NV && changedRef.current) NV.unload(changedRef.current);
      overlayInstance.current = null;
      originalInstance.current = null;
      changedInstance.current = null;
    };
  }, [licenseKey]);

  // Re-run the overlay + text diff when the page or blend mode changes.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-runs only on page/blend; helpers are ref-based and stable
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

  const TABS: { mode: ViewMode; label: string }[] = [
    { mode: "overlay", label: "Visual overlay" },
    { mode: "original", label: "Original document" },
    { mode: "changed", label: "Changed document" },
  ];

  const tabStyle = (mode: ViewMode, index: number): React.CSSProperties => {
    const active = viewMode === mode;
    return {
      padding: "4px 12px",
      fontSize: 13,
      border: "1px solid #c9c9d6",
      borderLeft: index === 0 ? "1px solid #c9c9d6" : "none",
      borderTopLeftRadius: index === 0 ? 4 : 0,
      borderBottomLeftRadius: index === 0 ? 4 : 0,
      borderTopRightRadius: index === TABS.length - 1 ? 4 : 0,
      borderBottomRightRadius: index === TABS.length - 1 ? 4 : 0,
      background: active ? "#6c5ce7" : "#fff",
      color: active ? "#fff" : "#333",
      cursor: "pointer",
    };
  };

  const paneLabel =
    viewMode === "overlay"
      ? "Visual Document Comparison (overlay)"
      : viewMode === "original"
        ? "Original Document — Rev A (changed text highlighted)"
        : "Changed Document — Rev B (added text highlighted)";

  return (
    <div style={{ position: "relative" }}>
      {loading && <LoadingSpinner message="Loading comparison…" />}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: "8px 4px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex" }}>
          {TABS.map((t, i) => (
            <button
              key={t.mode}
              type="button"
              onClick={() => setViewMode(t.mode)}
              disabled={loading}
              style={tabStyle(t.mode, i)}
            >
              {t.label}
            </button>
          ))}
        </div>
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
        <label
          style={{ fontSize: 13, opacity: viewMode === "overlay" ? 1 : 0.4 }}
        >
          Blend{" "}
          <select
            value={blendMode}
            onChange={(e) => setBlendMode(e.target.value)}
            disabled={loading || viewMode !== "overlay"}
          >
            {BLEND_MODES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={addMarkup} disabled={loading}>
          Add reviewer note
        </button>
      </div>
      <div
        style={{
          display: "flex",
          height: "70vh",
          minHeight: 560,
          border: "1px solid #e0e0ea",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #e0e0ea",
          }}
        >
          <div style={{ fontSize: 12, padding: "4px 8px", color: "#666" }}>
            {paneLabel}
          </div>
          {/* All instances stay mounted and full-size; visibility toggles which
              one shows, so none is ever loaded into a zero-size box. */}
          <div style={{ position: "relative", flex: 1 }}>
            <div
              ref={overlayRef}
              style={{
                position: "absolute",
                inset: 0,
                visibility: viewMode === "overlay" ? "visible" : "hidden",
              }}
            />
            <div
              ref={originalRef}
              style={{
                position: "absolute",
                inset: 0,
                visibility: viewMode === "original" ? "visible" : "hidden",
              }}
            />
            <div
              ref={changedRef}
              style={{
                position: "absolute",
                inset: 0,
                visibility: viewMode === "changed" ? "visible" : "hidden",
              }}
            />
          </div>
        </div>
        <ChangesRail
          changes={changes}
          selectedId={selectedId}
          markupCount={markupCount}
          onSelect={handleSelect}
        />
      </div>
    </div>
  );
}
