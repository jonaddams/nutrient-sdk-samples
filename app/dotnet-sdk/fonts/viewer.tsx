"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAppTheme } from "@/app/web-sdk/_components/useAppTheme";
import { fontFileFor } from "./fontFiles";

interface FontsViewerProps {
  blob: Blob;
  /** Font names to supply to the renderer. Empty array = render bare. */
  supplyFonts: string[];
}

export default function FontsViewer({ blob, supplyFonts }: FontsViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appTheme = useAppTheme();

  const objectUrl = useMemo(() => URL.createObjectURL(blob), [blob]);
  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  // Stable across renders so the load effect does not re-fire on every keystroke.
  const fontKey = supplyFonts.join("|");

  useEffect(() => {
    const container = containerRef.current;
    const NutrientViewer = (window as any).NutrientViewer;
    if (!container || !NutrientViewer) return;

    const customFonts = fontKey
      .split("|")
      .filter(Boolean)
      .map((name) => ({ name, file: fontFileFor(name) }))
      .filter((f) => f.file)
      .map(
        (f) =>
          new NutrientViewer.Font({
            name: f.name,
            callback: () => fetch(f.file as string).then((r) => r.blob()),
          }),
      );

    NutrientViewer.load({
      container,
      document: objectUrl,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      ...(customFonts.length > 0 ? { customFonts } : {}),
      theme:
        appTheme === "dark"
          ? NutrientViewer.Theme.DARK
          : NutrientViewer.Theme.LIGHT,
    }).catch((err: Error) => {
      console.error("Viewer load error:", err);
    });

    return () => {
      NutrientViewer.unload(container);
    };
  }, [objectUrl, appTheme, fontKey]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
