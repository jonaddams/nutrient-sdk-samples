"use client";

import { useEffect, useMemo, useRef } from "react";

interface PdfBlobViewerProps {
  blob: Blob;
}

export default function PdfBlobViewer({ blob }: PdfBlobViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive an object URL from the blob; revoke when blob changes or on unmount
  const objectUrl = useMemo(() => URL.createObjectURL(blob), [blob]);

  useEffect(() => {
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  useEffect(() => {
    const container = containerRef.current;
    const NutrientViewer = (window as any).NutrientViewer;
    if (!container || !NutrientViewer) return;

    NutrientViewer.load({
      container,
      document: objectUrl,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
    }).catch((err: Error) => {
      console.error("Viewer load error:", err);
    });

    return () => {
      NutrientViewer.unload(container);
    };
  }, [objectUrl]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
