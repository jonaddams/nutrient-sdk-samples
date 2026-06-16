"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { ChangesRail } from "./ChangesRail";
import { type ChangeEntry, extractChanges } from "./changes";

const DOC_A = "/documents/hybrid-comparison-a.pdf";
const DOC_B = "/documents/hybrid-comparison-b.pdf";

const BLEND_MODES = ["darken", "multiply", "difference"];

export function HybridComparisonViewer() {
  const licenseKey = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY;
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftInstance = useRef<Instance | null>(null);
  const rightInstance = useRef<Instance | null>(null);
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

  // Overlay the two documents on the left instance for one page.
  async function applyVisualOverlay(page: number, blend: string) {
    const NV = window.NutrientViewer;
    if (!NV || !leftInstance.current) return;
    await leftInstance.current.setDocumentComparisonMode({
      documentA: {
        source: NV.DocumentComparisonSourceType.USE_OPEN_DOCUMENT,
        pageIndex: page,
      },
      documentB: { source: DOC_B, pageIndex: page },
      blendMode: blend as never,
      autoCompare: true,
    });
  }

  // Run text comparison for one page, auto-highlight inserts, populate the rail.
  async function runTextComparison(page: number) {
    const NV = window.NutrientViewer;
    const right = rightInstance.current;
    if (!NV || !right) return;

    // Clear previous auto-highlights for the old page.
    if (autoAnnotationIds.current.length) {
      await Promise.all(
        autoAnnotationIds.current.map((id) => right.delete(id).catch(() => {})),
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
    const result = await right.compareDocuments(
      { originalDocument, changedDocument },
      op,
    );

    const extracted = extractChanges(result, page);

    const created: string[] = [];
    for (const c of extracted) {
      // Only inserts have a position in the changed (right) document.
      if (c.type !== "insert") continue;
      const annotation = new NV.Annotations.HighlightAnnotation({
        pageIndex: page,
        rects: NV.Immutable.List([
          new NV.Geometry.Rect({
            left: c.rect[0],
            top: c.rect[1],
            width: c.rect[2],
            height: c.rect[3],
          }),
        ]),
        color: NV.Color.fromHex("#ffe066"),
      });
      const res = await right.create(annotation);
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

  // Select a change in the rail and scroll the text pane to it.
  function handleSelect(c: ChangeEntry) {
    setSelectedId(c.id);
    const NV = window.NutrientViewer;
    const right = rightInstance.current;
    if (!NV || !right) return;
    right.setViewState(right.viewState.set("currentPageIndex", c.pageIndex));
    right.jumpToRect(
      c.pageIndex,
      new NV.Geometry.Rect({
        left: c.rect[0],
        top: c.rect[1],
        width: c.rect[2],
        height: c.rect[3],
      }),
    );
  }

  // Reviewer markup on the visual-overlay pane (works while in comparison mode).
  async function addOverlayMarkup() {
    const NV = window.NutrientViewer;
    const left = leftInstance.current;
    if (!NV || !left) return;
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
    const res = await left.create(note);
    if (Array.isArray(res) && res.length) {
      setMarkupCount((n) => n + res.length);
    }
  }

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
        leftInstance.current = await NV!.load({
          container: leftRef.current!,
          document: DOC_A,
          useCDN: true,
          licenseKey,
        });
        rightInstance.current = await NV!.load({
          container: rightRef.current!,
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
        setPageCount(leftInstance.current.totalPageCount);
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
      if (NV && leftRef.current) NV.unload(leftRef.current);
      if (NV && rightRef.current) NV.unload(rightRef.current);
      leftInstance.current = null;
      rightInstance.current = null;
    };
  }, [licenseKey]);

  // Re-run both comparisons when the page or blend mode changes.
  useEffect(() => {
    if (loading) return;
    applyVisualOverlay(pageIndex, blendMode);
    runTextComparison(pageIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            {Array.from({ length: pageCount }, (_, i) => (
              <option key={i} value={i}>
                {i + 1}
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
        <button type="button" onClick={addOverlayMarkup} disabled={loading}>
          Add note to overlay
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
        <div style={{ flex: 1, borderRight: "1px solid #e0e0ea" }}>
          <div style={{ fontSize: 12, padding: "4px 8px", color: "#666" }}>
            Visual overlay
          </div>
          <div
            ref={leftRef}
            style={{ width: "100%", height: "calc(100% - 24px)" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, padding: "4px 8px", color: "#666" }}>
            Text + changes
          </div>
          <div
            ref={rightRef}
            style={{ width: "100%", height: "calc(100% - 24px)" }}
          />
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
