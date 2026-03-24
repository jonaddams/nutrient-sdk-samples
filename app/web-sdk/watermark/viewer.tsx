"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";

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

// Track IDs of watermark annotations so we can remove them
const WATERMARK_IDS_KEY = "__watermarkAnnotationIds";

export default function WatermarkViewer({ config }: WatermarkViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const applyWatermarks = useCallback(
    async (inst: Instance, cfg: WatermarkConfig) => {
      const { NutrientViewer } = window;
      if (!NutrientViewer || !cfg.text.trim()) return;

      setIsApplying(true);
      try {
        // Remove previous watermark annotations
        const prevIds: string[] = (inst as any)[WATERMARK_IDS_KEY] ?? [];
        for (const id of prevIds) {
          try {
            // Find and delete by iterating pages
            for (let p = 0; p < inst.totalPageCount; p++) {
              const annotations = await inst.getAnnotations(p);
              const match = annotations.find((a: any) => a.id === id);
              if (match) {
                await inst.delete(match);
                break;
              }
            }
          } catch {
            // Annotation may already be removed
          }
        }

        // Create watermark text annotation on each page
        const newIds: string[] = [];
        for (let p = 0; p < inst.totalPageCount; p++) {
          const pageInfo = inst.pageInfoForIndex(p);
          if (!pageInfo) continue;

          const { width, height } = pageInfo;

          const id = NutrientViewer.generateInstantId();

          // Create annotation with a generous initial bounding box
          let annotation = new NutrientViewer.Annotations.TextAnnotation({
            id,
            pageIndex: p,
            boundingBox: new NutrientViewer.Geometry.Rect({
              left: 0,
              top: 0,
              width,
              height: cfg.fontSize * 1.5,
            }),
            text: { format: "plain", value: cfg.text },
            font: "Helvetica",
            fontSize: cfg.fontSize,
            fontColor: new NutrientViewer.Color(cfg.color),
            backgroundColor: null,
            horizontalAlign: "center",
            verticalAlign: "center",
            opacity: cfg.opacity,
            rotation: cfg.rotation,
            isEditable: false,
            isFitting: false,
          });

          // Let the SDK calculate the correct bounding box for the text
          annotation = inst.calculateFittingTextAnnotationBoundingBox(annotation);

          // Re-center the fitted box on the page
          const bbox = annotation.boundingBox;
          const centeredLeft = (width - bbox.width) / 2;
          const centeredTop = (height - bbox.height) / 2;
          annotation = annotation.set("boundingBox", new NutrientViewer.Geometry.Rect({
            left: centeredLeft,
            top: centeredTop,
            width: bbox.width,
            height: bbox.height,
          }));

          newIds.push(id);
          await inst.create(annotation);
        }

        (inst as any)[WATERMARK_IDS_KEY] = newIds;
      } catch (error) {
        console.error("Watermark error:", error);
      } finally {
        setIsApplying(false);
      }
    },
    [],
  );

  // Stable refs for mount effect
  const configRef = useRef(config);
  configRef.current = config;
  const applyWatermarksRef = useRef(applyWatermarks);
  applyWatermarksRef.current = applyWatermarks;

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
    }).then((instance: Instance) => {
      instanceRef.current = instance;
      applyWatermarksRef.current(instance, configRef.current);
    });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, []);

  // Re-apply when config changes
  const prevConfigRef = useRef<string>("");
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst) return;

    const serialized = JSON.stringify(config);
    if (serialized !== prevConfigRef.current) {
      prevConfigRef.current = serialized;
      applyWatermarks(inst, config);
    }
  }, [config, applyWatermarks]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {isApplying && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            borderRadius: 6,
            backgroundColor: "rgba(0,0,0,0.7)",
            color: "#fff",
            fontSize: 13,
          }}
        >
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
          >
            <title>Applying watermark...</title>
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              opacity="0.25"
            />
            <path
              fill="currentColor"
              opacity="0.75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Applying watermark...
        </div>
      )}
      <div ref={containerRef} style={{ height: "100%" }} />
    </div>
  );
}
