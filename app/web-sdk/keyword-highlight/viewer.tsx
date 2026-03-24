"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";

const DOCUMENT = "/documents/macaques.pdf";

const HIGHLIGHT_COLORS = [
  { name: "Yellow", value: "#FFD700" },
  { name: "Coral", value: "#FF6B6B" },
  { name: "Cyan", value: "#4DD0E1" },
  { name: "Lime", value: "#AED581" },
  { name: "Orchid", value: "#CE93D8" },
  { name: "Orange", value: "#FFB74D" },
];

interface HighlightResult {
  keyword: string;
  count: number;
  color: string;
}

interface KeywordHighlightViewerProps {
  keywords: string[];
  onHighlightResults: (results: HighlightResult[]) => void;
}

export default function KeywordHighlightViewer({
  keywords,
  onHighlightResults,
}: KeywordHighlightViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const prevKeywordsRef = useRef<string[]>([]);

  const highlightKeywords = useCallback(
    async (inst: Instance, terms: string[]) => {
      if (terms.length === 0) {
        onHighlightResults([]);
        return;
      }

      setIsHighlighting(true);
      const { NutrientViewer } = window;
      if (!NutrientViewer) return;

      try {
        // Remove all existing highlight annotations across all pages
        const totalPages = inst.totalPageCount;
        for (let page = 0; page < totalPages; page++) {
          const annotations = await inst.getAnnotations(page);
          const highlights = annotations.filter(
            (ann: any) =>
              ann instanceof NutrientViewer.Annotations.HighlightAnnotation,
          );
          if (highlights.size > 0) {
            for (const highlight of highlights.toArray()) {
              await inst.delete(highlight);
            }
          }
        }

        // Search and highlight each keyword
        const results: HighlightResult[] = [];
        const allAnnotations: any[] = [];

        for (let i = 0; i < terms.length; i++) {
          const term = terms[i];
          const color = HIGHLIGHT_COLORS[i % HIGHLIGHT_COLORS.length];
          const searchResults = await inst.search(term);

          let count = 0;
          searchResults.forEach((result: any) => {
            const { rectsOnPage, pageIndex } = result.toObject();
            const rectsArray = rectsOnPage ? rectsOnPage.toArray() : [];
            if (rectsArray.length === 0) return;

            const rects = NutrientViewer.Immutable.List(
              rectsArray.map(
                (rect: any) =>
                  new NutrientViewer.Geometry.Rect({
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                  }),
              ),
            ) as any;

            // Parse hex color to RGB components
            const hex = color.value;
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);

            allAnnotations.push(
              new NutrientViewer.Annotations.HighlightAnnotation({
                id: NutrientViewer.generateInstantId(),
                pageIndex,
                boundingBox: NutrientViewer.Geometry.Rect.union(rects),
                rects,
                color: new NutrientViewer.Color({ r, g, b }),
              }),
            );
            count++;
          });

          results.push({ keyword: term, count, color: color.value });
        }

        // Apply all highlights at once
        if (allAnnotations.length > 0) {
          await inst.create(allAnnotations);
        }

        onHighlightResults(results);
      } catch (error) {
        console.error("Highlight error:", error);
      } finally {
        setIsHighlighting(false);
      }
    },
    [onHighlightResults],
  );

  // Load the viewer (mount-only — keywords are handled by the effect below)
  const keywordsRef = useRef(keywords);
  keywordsRef.current = keywords;
  const highlightKeywordsRef = useRef(highlightKeywords);
  highlightKeywordsRef.current = highlightKeywords;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      theme: NutrientViewer.Theme.DARK,
      toolbarItems: (NutrientViewer.defaultToolbarItems ?? []).filter(
        (item: { type: string }) =>
          ["pager", "zoom-out", "zoom-in", "zoom-mode"].includes(item.type),
      ),
    }).then((instance: Instance) => {
      instanceRef.current = instance;
      if (keywordsRef.current.length > 0) {
        highlightKeywordsRef.current(instance, keywordsRef.current);
      }
    });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, []);

  // Re-highlight when keywords change
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;

    const prev = prevKeywordsRef.current;
    const changed =
      prev.length !== keywords.length ||
      prev.some((k, i) => k !== keywords[i]);

    if (changed) {
      prevKeywordsRef.current = keywords;
      highlightKeywords(inst, keywords);
    }
  }, [keywords, highlightKeywords]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {isHighlighting && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 6,
            backgroundColor: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: 13,
          }}
        >
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
          >
            <title>Highlighting...</title>
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              opacity="0.25"
            />
            <path
              fill="currentColor"
              opacity="0.75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Highlighting...
        </div>
      )}
      <div ref={containerRef} style={{ height: "100%" }} />
    </div>
  );
}
