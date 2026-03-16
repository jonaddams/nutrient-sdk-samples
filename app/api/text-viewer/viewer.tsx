"use client";

import { useEffect, useRef } from "react";

interface ViewerProps {
  documentUrl: string;
}

export default function Viewer({ documentUrl }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // biome-ignore lint/suspicious/noExplicitAny: NutrientViewer instance type is not available
  const instanceRef = useRef<any>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    let isMounted = true;

    const loadViewer = async () => {
      try {
        const NutrientViewer = window.NutrientViewer;

        if (!NutrientViewer) {
          console.error("NutrientViewer is not loaded");
          return;
        }

        while (container.firstChild) {
          container.removeChild(container.firstChild);
        }

        try {
          await NutrientViewer.unload(container);
        } catch {
          // No existing instance
        }

        if (!isMounted) return;

        const instance = await NutrientViewer.load({
          container,
          document: documentUrl,
          licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
          instant: false,
          pageRendering: "next",
          useCDN: true,
        });

        if (!isMounted) {
          await NutrientViewer.unload(container);
          return;
        }

        instanceRef.current = instance;
      } catch (error) {
        console.error("Error loading viewer:", error);
        hasLoadedRef.current = false;
      }
    };

    loadViewer();

    return () => {
      isMounted = false;
      hasLoadedRef.current = false;

      const NutrientViewer = window.NutrientViewer;
      if (NutrientViewer && container) {
        try {
          NutrientViewer.unload(container);
        } catch {
          // Ignore unload errors
        }
      }

      instanceRef.current = null;
    };
  }, [documentUrl]);

  return (
    <div className="relative h-full w-full" style={{ minHeight: "600px" }}>
      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ minHeight: "600px" }}
      />
    </div>
  );
}
