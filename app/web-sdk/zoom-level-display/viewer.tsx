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

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
    }).then((instance: Instance) => {
      instanceRef.current = instance;

      // Set the default zoom level to 100% on load
      instance.setViewState((viewState: any) => viewState.set("zoom", 1));

      // Create a custom toolbar item to display zoom percentage
      const toolbarItems = [
        {
          type: "custom",
          title: "100%",
          id: "zoom-display",
          dropdownGroup: "zoomGroup",
          selected: true,
          tooltip: "Reset to 100%",
          onPress: () => {
            instance.setViewState((viewState: any) => viewState.set("zoom", 1));
          },
        },
      ];

      // Add the custom toolbar item to the toolbar
      instance.setToolbarItems((items: any[]) => items.concat(toolbarItems));

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
