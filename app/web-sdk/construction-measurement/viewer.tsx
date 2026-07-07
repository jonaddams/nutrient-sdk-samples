"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef } from "react";

const DOCUMENT = "/documents/floor-plan-layers.pdf";

export default function ConstructionMeasurementViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer: NV } = window;

    NV.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      toolbarItems: (NV.defaultToolbarItems ?? []).filter(
        (item: { type: string }) =>
          ["pager", "zoom-out", "zoom-in", "zoom-mode"].includes(item.type),
      ),
    })
      .then((instance: Instance) => {
        instanceRef.current = instance;
      })
      .catch((error: Error) => {
        console.error("Error loading viewer:", error);
      });

    return () => {
      instanceRef.current = null;
      NV.unload(container);
    };
  }, []);

  return (
    <div className="flex h-full">
      <div style={{ flex: 1, position: "relative" }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>
    </div>
  );
}
