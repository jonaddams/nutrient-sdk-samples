"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef } from "react";

const DOCUMENT = "/documents/jacques-torres-chocolate-chip-cookies.pdf";

export interface WatermarkConfig {
  text: string;
  fontSize: number;
  color: { r: number; g: number; b: number };
  opacity: number;
  rotation: number;
}

interface WatermarkViewerProps {
  config: WatermarkConfig;
}

export default function WatermarkViewer({ config }: WatermarkViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const configRef = useRef(config);
  configRef.current = config;

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
      toolbarItems: (NutrientViewer.defaultToolbarItems ?? []).filter(
        (item: { type: string }) =>
          ["pager", "zoom-out", "zoom-in", "zoom-mode"].includes(item.type),
      ),
      renderPageCallback(ctx: CanvasRenderingContext2D, _pageIndex: number, pageSize: { width: number; height: number }) {
        const cfg = configRef.current;
        if (!cfg.text.trim()) return;

        const { r, g, b } = cfg.color;

        ctx.save();

        // Move origin to center of page
        ctx.translate(pageSize.width / 2, pageSize.height / 2);

        // Apply rotation (convert degrees to radians)
        ctx.rotate((cfg.rotation * Math.PI) / 180);

        // Set text style
        ctx.globalAlpha = cfg.opacity;
        ctx.font = `bold ${cfg.fontSize}px Helvetica, Arial, sans-serif`;
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Draw the watermark text at center
        ctx.fillText(cfg.text, 0, 0);

        ctx.restore();
      },
    }).then((instance: Instance) => {
      instanceRef.current = instance;
    });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, []);

  // Re-render pages when config changes to update the watermark
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;

    // Force re-render all pages by toggling a no-op view state update
    inst.setViewState((vs: any) => vs);
  }, [config]);

  return <div ref={containerRef} style={{ height: "100%" }} />;
}
