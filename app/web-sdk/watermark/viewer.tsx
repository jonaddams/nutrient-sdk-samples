"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef } from "react";

const DOCUMENT = "/documents/jacques-torres-chocolate-chip-cookies-recipe.pdf";

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;
    const { text, fontSize, color, opacity, rotation } = config;

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
      renderPageCallback(
        ctx: CanvasRenderingContext2D,
        _pageIndex: number,
        pageSize: { width: number; height: number },
      ) {
        if (!text.trim()) return;

        ctx.save();

        // Move origin to center of page
        ctx.translate(pageSize.width / 2, pageSize.height / 2);

        // Apply rotation (convert degrees to radians)
        ctx.rotate((rotation * Math.PI) / 180);

        // Set text style
        ctx.globalAlpha = opacity;
        ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
        ctx.fillStyle = `rgb(${color.r}, ${color.g}, ${color.b})`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Draw the watermark text at center
        ctx.fillText(text, 0, 0);

        ctx.restore();
      },
    }).then((instance: Instance) => {
      instanceRef.current = instance;
    });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
    // Reload viewer when any config value changes so renderPageCallback picks it up
  }, [config]);

  return <div ref={containerRef} style={{ height: "100%" }} />;
}
