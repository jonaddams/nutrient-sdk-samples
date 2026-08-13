"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAppTheme } from "@/app/web-sdk/_components/useAppTheme";
import { buildCustomFonts } from "./fontFiles";

interface FontsViewerProps {
  blob: Blob;
  /** Font names to supply to the renderer. Empty array = render bare. */
  supplyFonts: string[];
}

export default function FontsViewer({ blob, supplyFonts }: FontsViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appTheme = useAppTheme();

  // NutrientViewer must be load()-ed exactly once per document: it snapshots
  // its Standalone configuration on the first load() call and asserts if a
  // later load() on the same page passes a different one — which is why
  // this sample gives each pane its own iframe/page rather than mounting
  // two <FontsViewer> instances side by side.
  // useAppTheme() can settle to a different value shortly after mount, so
  // capture it once here rather than react to it — live theme re-sync for
  // an already-loaded viewer is intentionally out of scope.
  const initialThemeRef = useRef(appTheme);

  const objectUrl = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  // Stable across renders so the load effect does not re-fire on every keystroke.
  const fontKey = supplyFonts.join("|");

  useEffect(() => {
    const container = containerRef.current;
    const NutrientViewer = (window as any).NutrientViewer;
    if (!container || !NutrientViewer) return;

    const names = fontKey.split("|").filter(Boolean);
    const customFonts = buildCustomFonts(NutrientViewer, names);

    NutrientViewer.load({
      container,
      document: objectUrl,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      ...(customFonts.length > 0 ? { customFonts } : {}),
      theme:
        initialThemeRef.current === "dark"
          ? NutrientViewer.Theme.DARK
          : NutrientViewer.Theme.LIGHT,
    }).catch((err: Error) => {
      console.error("Viewer load error:", err);
    });

    return () => {
      NutrientViewer.unload(container);
    };
  }, [objectUrl, fontKey]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
