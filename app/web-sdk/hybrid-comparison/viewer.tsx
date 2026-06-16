"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { ChangesRail } from "./ChangesRail";
import { type ChangeEntry, extractChanges } from "./changes";

const DOC_A = "/documents/hybrid-comparison-a.pdf";
const DOC_B = "/documents/hybrid-comparison-b.pdf";

const BLEND_MODES = ["darken", "multiply", "difference"];
const INSERT_COLOR = "#ffe066";

type ViewMode = "overlay" | "changed";

export function HybridComparisonViewer() {
  const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY;
  // Two stacked instances: the SDK's visual comparison overlay (Rev A base),
  // and a normal viewer of the changed document (Rev B) where highlight
  // annotations actually render. A toggle controls which is visible; the
  // changed-doc instance also runs the text diff (no separate helper needed).
  const overlayRef = useRef<HTMLDivElement>(null);
  const changedRef = useRef<HTMLDivElement>(null);
  const overlayInstance = useRef<Instance | null>(null);
  const changedInstance = useRef<Instance | null>(null);
  const autoAnnotationIds = useRef<string[]>([]);
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

  // Compute the text diff on the changed-doc instance, highlight each inserted
  // change there (highlights render on this normal view), and populate the rail.
  async function runTextComparison(page: number) {
    const NV = window.NutrientViewer;
    const changed = changedInstance.current;
    if (!NV || !changed) return;

    if (autoAnnotationIds.current.length) {
      await Promise.all(
        autoAnnotationIds.current.map((id) =>
          changed.delete(id).catch(() => {}),
        ),
      );
      autoAnnotationIds.current = [];
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

    // Inserts carry coordinates in the changed document, so they highlight
    // correctly here. Deletes (text only in the original) are listed in the
    // rail without a highlight.
    const created: string[] = [];
    for (const c of extracted) {
      if (c.type !== "insert") continue;
      const rect = new NV.Geometry.Rect({
        left: c.rect[0],
        top: c.rect[1],
        width: c.rect[2],
        height: c.rect[3],
      });
      const annotation = new NV.Annotations.HighlightAnnotation({
        pageIndex: page,
        rects: NV.Immutable.List([rect]),
        boundingBox: rect,
        color: NV.Color.fromHex(INSERT_COLOR),
      });
      const res = await changed.create(annotation);
      const id =
        Array.isArray(res) && res[0] ? (res[0] as { id: string }).id : null;
      if (id) {
        created.push(id);
        c.id = id; // tie the rail entry to its annotation for navigation
      }
    }
    autoAnnotationIds.current = created;
    setChanges(extracted);
    setSelectedId(null);
  }

  // Select a change: flip to the changed-doc view and scroll to its highlight.
  function handleSelect(c: ChangeEntry) {
    setSelectedId(c.id);
    setViewMode("changed");
    const NV = window.NutrientViewer;
    const changed = changedInstance.current;
    if (!NV || !changed) return;
    changed.setViewState(
      changed.viewState.set("currentPageIndex", c.pageIndex),
    );
    changed.jumpToRect(
      c.pageIndex,
      new NV.Geometry.Rect({
        left: c.rect[0],
        top: c.rect[1],
        width: c.rect[2],
        height: c.rect[3],
      }),
    );
  }

  // Reviewer markup on the changed-doc view (renders there, unlike the overlay).
  async function addMarkup() {
    const NV = window.NutrientViewer;
    const changed = changedInstance.current;
    if (!NV || !changed) return;
    setViewMode("changed");
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
    const res = await changed.create(note);
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
        const changedContainer = changedRef.current;
        if (!overlayContainer || !changedContainer) return;
        overlayInstance.current = await NV.load({
          container: overlayContainer,
          document: DOC_A,
          useCDN: true,
          licenseKey,
        });
        changedInstance.current = await NV.load({
          container: changedContainer,
          document: DOC_B,
          useCDN: true,
          licenseKey,
          toolbarItems: [
            { type: "pan" },
            { type: "zoom-out" },
            { type: "zoom-in" },
            { type: "highlighter" },
            { type: "note" },
            { type: "ink" },
            { type: "rectangle" },
          ] as never,
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
      if (NV && changedRef.current) NV.unload(changedRef.current);
      overlayInstance.current = null;
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

  const segBtn = (active: boolean): React.CSSProperties => ({
    padding: "4px 12px",
    fontSize: 13,
    border: "1px solid #c9c9d6",
    background: active ? "#6c5ce7" : "#fff",
    color: active ? "#fff" : "#333",
    cursor: "pointer",
  });

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
          <button
            type="button"
            onClick={() => setViewMode("overlay")}
            disabled={loading}
            style={{
              ...segBtn(viewMode === "overlay"),
              borderRadius: "4px 0 0 4px",
            }}
          >
            Visual overlay
          </button>
          <button
            type="button"
            onClick={() => setViewMode("changed")}
            disabled={loading}
            style={{
              ...segBtn(viewMode === "changed"),
              borderRadius: "0 4px 4px 0",
              borderLeft: "none",
            }}
          >
            Changed document
          </button>
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
            {viewMode === "overlay"
              ? "Visual Document Comparison (overlay)"
              : "Changed Document — Rev B (highlighted changes)"}
          </div>
          {/* Both instances stay mounted and full-size; visibility toggles which
              one shows, so neither viewer is ever loaded into a zero-size box. */}
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
