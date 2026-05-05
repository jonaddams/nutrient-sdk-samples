"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import type { Locator } from "./types";

interface SearchViewerProps {
  filename: string;     // path within /public/documents/
  query: string;
  locator: Locator;
}

/**
 * Loads a document in the Nutrient viewer, then on each {query, locator}
 * change runs `instance.search(query)`, jumps to the matching page, and
 * draws a single highlight annotation on the best match.
 *
 * Lifecycle: the viewer instance is reloaded only when `filename` changes;
 * picking a different result for the same file just re-runs the highlight
 * effect against the existing instance.
 */
export function SearchViewer({ filename, query, locator }: SearchViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [instance, setInstance] = useState<Instance | null>(null);
  const currentHighlightRef = useRef<{ annotation: any; pageIndex: number } | null>(null);
  // Synchronous flag — flips to false the moment we begin tearing down the
  // current viewer, before React re-renders with `instance = null`. The
  // highlight effect checks this to avoid calling into an instance that has
  // already been unloaded by a concurrent file-change.
  const instanceReadyRef = useRef(false);

  // Load (and unload) the viewer when the file changes.
  useEffect(() => {
    let mounted = true;
    const container = containerRef.current;
    const { NutrientViewer } = window;
    if (!container || !NutrientViewer) return;

    instanceReadyRef.current = false;
    setInstance(null);
    currentHighlightRef.current = null;

    NutrientViewer.load({
      container,
      document: `/documents/indexed/${filename}`,
      allowLinearizedLoading: true,
      pageRendering: "next",
      useCDN: true,
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
    })
      .then((loaded: Instance) => {
        if (!mounted) {
          NutrientViewer.unload(container);
          return;
        }
        instanceReadyRef.current = true;
        setInstance(loaded);
      })
      .catch((err) => {
        console.error("Failed to load viewer:", err);
      });

    return () => {
      mounted = false;
      instanceReadyRef.current = false;
      NutrientViewer.unload(container);
    };
  }, [filename]);

  // Apply highlight whenever query or locator changes (or instance becomes ready).
  useEffect(() => {
    if (!instance || !instanceReadyRef.current || !query.trim()) return;
    let cancelled = false;

    (async () => {
      const { NutrientViewer } = window;
      if (!NutrientViewer) return;

      // Remove the previous highlight, if any.
      const prev = currentHighlightRef.current;
      if (prev) {
        try {
          await instance.delete(prev.annotation);
        } catch (err) {
          console.warn("Could not delete previous highlight:", err);
        }
        currentHighlightRef.current = null;
      }

      // Sweep stray HighlightAnnotations on the page we're jumping to.
      // (Defensive — covers cases where we missed a previous handle.)
      const targetPageHint =
        locator.type === "page" || locator.type === "slide" ? locator.value : null;

      let searchResults;
      try {
        searchResults = await instance.search(query);
      } catch (err) {
        console.error("In-document search failed:", err);
        return;
      }
      if (cancelled) return;

      const all = searchResults.toArray();
      if (all.length === 0) return;

      // Prefer a hit on the indexed page (PDF/PPTX); otherwise take the first.
      const chosen =
        (targetPageHint != null
          ? all.find((r: any) => r.pageIndex === targetPageHint)
          : null) ?? all[0];
      const obj = chosen.toObject();
      const pageIndex: number = obj.pageIndex ?? 0;

      // Jump to the page containing the match.
      await instance.setViewState((vs: any) =>
        vs.set("currentPageIndex", pageIndex),
      );
      if (cancelled) return;

      // Sweep stray highlights on the destination page.
      try {
        const annotationsOnPage = await instance.getAnnotations(pageIndex);
        const stale = annotationsOnPage.filter(
          (a: any) => a instanceof NutrientViewer.Annotations.HighlightAnnotation,
        );
        for (const ann of stale.toArray()) {
          await instance.delete(ann);
        }
      } catch (err) {
        console.warn("Could not sweep stale highlights:", err);
      }
      if (cancelled) return;

      // Build and apply the new highlight.
      const rectsArr = obj.rectsOnPage.toArray();
      if (rectsArr.length === 0) return;
      const rects = NutrientViewer.Immutable.List(
        rectsArr.map(
          (r: any) =>
            new NutrientViewer.Geometry.Rect({
              left: r.left,
              top: r.top,
              width: r.width,
              height: r.height,
            }),
        ),
      );
      const annotation = new NutrientViewer.Annotations.HighlightAnnotation({
        pageIndex: pageIndex,
        rects,
        boundingBox: NutrientViewer.Geometry.Rect.union(rects),
      });

      try {
        const created = await instance.create(annotation);
        if (cancelled) return;
        if (created && created.length > 0) {
          currentHighlightRef.current = {
            annotation: created[0],
            pageIndex: pageIndex,
          };
        }
      } catch (err) {
        console.error("Could not create highlight annotation:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [instance, query, locator]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", position: "relative" }}
    />
  );
}
