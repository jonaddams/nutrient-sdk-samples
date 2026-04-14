"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";

const DOCUMENT = "/documents/jacques-torres-chocolate-chip-cookies-recipe.pdf";

interface PageText {
  pageIndex: number;
  text: string;
}

interface TextExtractionViewerProps {
  onPageTexts: (pages: PageText[]) => void;
  onTotalPages: (count: number) => void;
  onCurrentPage: (page: number) => void;
}

export default function TextExtractionViewer({
  onPageTexts,
  onTotalPages,
  onCurrentPage,
}: TextExtractionViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const extractAllPages = useCallback(
    async (inst: Instance) => {
      setIsExtracting(true);
      try {
        const totalPages = inst.totalPageCount;
        onTotalPages(totalPages);

        const pages: PageText[] = [];
        for (let i = 0; i < totalPages; i++) {
          const textLines = await inst.textLinesForPageIndex(i);
          const text = textLines.map((l: any) => l.contents).join("\n");
          pages.push({ pageIndex: i, text });
        }
        onPageTexts(pages);
      } catch (error) {
        console.error("Text extraction error:", error);
      } finally {
        setIsExtracting(false);
      }
    },
    [onPageTexts, onTotalPages],
  );

  const onPageTextsRef = useRef(onPageTexts);
  onPageTextsRef.current = onPageTexts;
  const onTotalPagesRef = useRef(onTotalPages);
  onTotalPagesRef.current = onTotalPages;
  const extractAllPagesRef = useRef(extractAllPages);
  extractAllPagesRef.current = extractAllPages;

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
      toolbarItems: (NutrientViewer.defaultToolbarItems ?? []).filter(
        (item: { type: string }) =>
          ["pager", "zoom-out", "zoom-in", "zoom-mode", "search"].includes(
            item.type,
          ),
      ),
    }).then((instance: Instance) => {
      instanceRef.current = instance;

      // Track current page
      instance.addEventListener(
        "viewState.currentPageIndex.change",
        (pageIndex: unknown) => {
          if (typeof pageIndex === "number") {
            onCurrentPage(pageIndex);
          }
        },
      );

      // Extract text from all pages on load
      extractAllPagesRef.current(instance);
    });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, [onCurrentPage]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {isExtracting && (
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
            <title>Extracting text...</title>
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
          Extracting text...
        </div>
      )}
      <div ref={containerRef} style={{ height: "100%" }} />
    </div>
  );
}
