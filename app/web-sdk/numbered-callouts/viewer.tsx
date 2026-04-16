"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import type { Callout } from "./callouts";

const DOCUMENT = "/documents/floor-plan-layers.pdf";

export default function NumberedCalloutsViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [callouts, _setCallouts] = useState<Callout[]>([]);

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
      styleSheets: ["/numbered-callouts.css"],
    })
      .then((instance: Instance) => {
        instanceRef.current = instance;
      })
      .catch((error: Error) => {
        console.error("Error loading viewer:", error);
      });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, []);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col overflow-y-auto">
        <div className="p-5">
          <p className="text-sm text-gray-600 dark:text-gray-400 pb-4">
            Place numbered callouts on the floor plan and manage them from the
            list below.
          </p>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {callouts.length} callout{callouts.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {/* Viewer Container */}
      <div
        ref={containerRef}
        style={{ flex: 1, height: "100%", position: "relative" }}
      />
    </div>
  );
}
