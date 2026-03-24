"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef } from "react";

interface MultiDocumentViewerProps {
  document: string;
  initialPage?: number;
  onPageChange?: (pageIndex: number) => void;
}

export default function MultiDocumentViewer({
  document: documentUrl,
  initialPage = 0,
  onPageChange,
}: MultiDocumentViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    NutrientViewer.load({
      container,
      document: documentUrl,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      initialViewState: new NutrientViewer.ViewState({
        currentPageIndex: initialPage,
      }),
    }).then((instance: Instance) => {
      instanceRef.current = instance;

      instance.addEventListener(
        "viewState.currentPageIndex.change",
        (pageIndex: unknown) => {
          if (typeof pageIndex === "number") {
            onPageChangeRef.current?.(pageIndex);
          }
        },
      );
    });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, [documentUrl, initialPage]);

  return <div ref={containerRef} style={{ height: "100%" }} />;
}
