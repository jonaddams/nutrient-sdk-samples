"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef } from "react";

const DOCUMENT = "/documents/jacques-torres-chocolate-chip-cookies-recipe.pdf";

export default function ZoomLevelDisplayViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    // Minimal toolbar focused on zoom interactions — keeps the custom
    // "100%" zoom-display button visible at any viewer width. Custom
    // className applies the design-system accent via styleSheets below.
    const zoomDisplayItem = {
      type: "custom",
      title: "100%",
      id: "zoom-display",
      className: "zoom-display-btn",
      tooltip: "Reset to 100%",
    };

    const toolbarItems = [
      { type: "pager" },
      { type: "pan" },
      { type: "zoom-out" },
      { type: "zoom-in" },
      { type: "zoom-mode" },
      zoomDisplayItem,
    ];

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      toolbarItems: toolbarItems as any,
      styleSheets: ["/zoom-level-display.css"],
    }).then((instance: Instance) => {
      instanceRef.current = instance;

      // Set the default zoom level to 100% on load
      instance.setViewState((viewState: any) => viewState.set("zoom", 1));

      // Wire the click handler now that we have an instance.
      instance.setToolbarItems((items: any[]) =>
        items.map((item) =>
          item.id === "zoom-display"
            ? {
                ...item,
                onPress: () =>
                  instance.setViewState((viewState: any) =>
                    viewState.set("zoom", 1),
                  ),
              }
            : item,
        ),
      );

      // Update zoom display dynamically when zoom changes
      instance.addEventListener("viewState.zoom.change", (zoom: unknown) => {
        if (typeof zoom === "number") {
          const percentage = Math.round(zoom * 100) + "%";
          instance.setToolbarItems((items: any[]) =>
            items.map((item) =>
              item.id === "zoom-display"
                ? { ...item, title: percentage }
                : item,
            ),
          );
        }
      });
    });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, []);

  return <div ref={containerRef} style={{ height: "100%" }} />;
}
