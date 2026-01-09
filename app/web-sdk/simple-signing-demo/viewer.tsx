"use client";

import { useEffect, useRef, useState } from "react";
import type { Instance } from "@nutrient-sdk/viewer";
import "./styles.css";

export default function SigningDemoViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    let isMounted = true;

    const loadViewer = async () => {
      try {
        const instance = await window.NutrientViewer.load({
          container,
          document: "/documents/blank.pdf",
          licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
          useCDN: true,
        });

        if (!isMounted) return;
        instanceRef.current = instance;
      } catch (error) {
        console.error("Error loading viewer:", error);
      }
    };

    loadViewer();

    return () => {
      isMounted = false;
      if (container && window.NutrientViewer) {
        window.NutrientViewer.unload(container);
      }
    };
  }, []);

  return (
    <div className="signing-demo-wrapper">
      <div ref={containerRef} className="signing-demo-viewer" />
    </div>
  );
}

declare global {
  interface Window {
    NutrientViewer?: {
      load: (config: {
        container: HTMLElement;
        document: string;
        licenseKey: string | undefined;
        useCDN: boolean;
      }) => Promise<Instance>;
      unload: (container: HTMLElement) => void;
    };
  }
}
