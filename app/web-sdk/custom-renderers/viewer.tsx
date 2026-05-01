"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import { rendererMap } from "./renderers";

const DOCUMENT = "/documents/blank.pdf";

type AnnotationConfig = {
  rendererType: string;
  label: string;
  rect: { left: number; top: number; width: number; height: number };
  props?: Record<string, unknown>;
};

type Category = {
  name: string;
  renderers: AnnotationConfig[];
};

const categories: Category[] = [
  {
    name: "Visual Effects",
    renderers: [
      {
        rendererType: "neon-sign",
        label: "Neon Sign",
        rect: { left: 50, top: 60, width: 200, height: 60 },
        props: { text: "APPROVED", color: "#ff6ec7" },
      },
      {
        rendererType: "hologram",
        label: "Holographic Foil",
        rect: { left: 300, top: 60, width: 200, height: 60 },
      },
      {
        rendererType: "glassmorphism",
        label: "Glassmorphism",
        rect: { left: 50, top: 160, width: 250, height: 50 },
        props: {
          text: "This section needs review \u2014 see comments from legal",
        },
      },
      {
        rendererType: "3d-stamp",
        label: "3D Transform",
        rect: { left: 350, top: 160, width: 180, height: 60 },
      },
    ],
  },
  {
    name: "Animated",
    renderers: [
      {
        rendererType: "callout",
        label: "Attention Callout",
        rect: { left: 50, top: 60, width: 180, height: 50 },
        props: { text: "Sign Here" },
      },
      {
        rendererType: "confetti",
        label: "Confetti",
        rect: { left: 300, top: 60, width: 220, height: 80 },
        props: { text: "MILESTONE REACHED" },
      },
      {
        rendererType: "matrix",
        label: "Matrix Rain",
        rect: { left: 50, top: 160, width: 220, height: 80 },
        props: { text: "FOLLOW THE WHITE RABBIT \uD83D\uDC07" },
      },
      {
        rendererType: "aquarium",
        label: "Aquarium",
        rect: { left: 320, top: 160, width: 200, height: 80 },
      },
    ],
  },
  {
    name: "Data & Status",
    renderers: [
      {
        rendererType: "data-viz",
        label: "Data Visualization",
        rect: { left: 50, top: 60, width: 200, height: 90 },
        props: {
          values: [40, 60, 35, 80, 55, 95],
          label: "Q1\u2013Q4 Revenue",
        },
      },
      {
        rendererType: "approval-badge",
        label: "Approval Badge",
        rect: { left: 300, top: 60, width: 230, height: 50 },
        props: { name: "Jane Smith", status: "approved", timestamp: "2m ago" },
      },
      {
        rendererType: "interactive-widget",
        label: "Interactive Widget",
        rect: { left: 50, top: 190, width: 180, height: 80 },
        props: { rating: 4, deadlineMs: Date.now() + 14 * 24 * 60 * 60 * 1000 },
      },
      {
        rendererType: "retro-pixel",
        label: "Retro Pixel Art",
        rect: { left: 300, top: 190, width: 180, height: 60 },
        props: { progress: 5, text: "COMPLETE!" },
      },
    ],
  },
  {
    name: "Creative",
    renderers: [
      {
        rendererType: "comic-bubble",
        label: "Comic Bubble",
        rect: { left: 50, top: 60, width: 220, height: 70 },
        props: { text: "This looks amazing!" },
      },
      {
        rendererType: "scratch-off",
        label: "Scratch-Off",
        rect: { left: 320, top: 60, width: 200, height: 70 },
        props: { revealText: "You found a secret!" },
      },
      {
        rendererType: "rich-media",
        label: "Rich Media Player",
        rect: { left: 50, top: 170, width: 220, height: 100 },
        props: { title: "Training Video 01" },
      },
      {
        rendererType: "mini-game",
        label: "Mini-Game (Breakout)",
        rect: { left: 320, top: 170, width: 200, height: 100 },
      },
    ],
  },
];

export default function CustomRenderersViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [activeCategory, setActiveCategory] = useState(0);
  const createdAnnotationIdsRef = useRef<string[]>([]);

  const clearCustomAnnotations = useCallback(async () => {
    const instance = instanceRef.current;
    if (!instance) return;

    for (const id of createdAnnotationIdsRef.current) {
      try {
        await instance.delete(id);
      } catch {
        // Annotation may already be deleted
      }
    }
    createdAnnotationIdsRef.current = [];
  }, []);

  const loadCategory = useCallback(
    async (categoryIndex: number) => {
      const instance = instanceRef.current;
      const NV = window.NutrientViewer;
      if (!instance || !NV) return;

      await clearCustomAnnotations();

      const category = categories[categoryIndex];
      const ids: string[] = [];

      for (const config of category.renderers) {
        const annotation = new NV.Annotations.NoteAnnotation({
          pageIndex: 0,
          boundingBox: new NV.Geometry.Rect(config.rect),
          text: { format: "plain" as const, value: config.label },
          color: NV.Color.TRANSPARENT,
          customData: {
            rendererType: config.rendererType,
            category: category.name,
            ...(config.props || {}),
          },
        });

        try {
          // biome-ignore lint/suspicious/noExplicitAny: Nutrient SDK create() returns a union type
          const created: any = await instance.create(annotation);
          const createdAnnotation = Array.isArray(created)
            ? created[0]
            : created;
          if (createdAnnotation?.id) {
            ids.push(createdAnnotation.id as string);
          }
        } catch (err) {
          console.error(
            `Failed to create ${config.rendererType} annotation:`,
            err,
          );
        }
      }

      createdAnnotationIdsRef.current = ids;
    },
    [clearCustomAnnotations],
  );

  const handleTabClick = useCallback(
    (index: number) => {
      setActiveCategory(index);
      loadCategory(index);
    },
    [loadCategory],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: Only load viewer once on mount
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
      styleSheets: ["/custom-renderers.css"],
      customRenderers: {
        // biome-ignore lint/suspicious/noExplicitAny: annotation type not fully available
        Annotation: ({ annotation }: any) => {
          const rendererType = annotation.customData?.rendererType;
          if (!rendererType) return null;

          const renderFn = rendererMap[rendererType];
          return renderFn ? renderFn(annotation) : null;
        },
      },
    })
      .then((instance: Instance) => {
        instanceRef.current = instance;
        loadCategory(0);
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
      <div
        className="w-72 flex flex-col overflow-y-auto"
        style={{
          background: "var(--bg-elev)",
          borderRight: "1px solid var(--line)",
        }}
      >
        <div className="p-5">
          <div className="panel-section" style={{ paddingTop: 0, marginBottom: 8 }}>
            Categories
          </div>
          <p
            className="text-sm pb-5"
            style={{ color: "var(--ink-3)" }}
          >
            Select a category to see different custom annotation renderers
            applied to the document.
          </p>

          {/* Category Tabs */}
          <div className="space-y-2">
            {categories.map((category, index) => {
              const isActive = activeCategory === index;
              return (
                <button
                  key={category.name}
                  type="button"
                  className="w-full text-left px-4 py-3 transition-all cursor-pointer"
                  style={{
                    background: isActive
                      ? "var(--accent-tint)"
                      : "transparent",
                    border: `1px solid ${
                      isActive ? "var(--accent)" : "var(--line)"
                    }`,
                    borderRadius: "var(--r-2)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--accent-tint)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                  onClick={() => handleTabClick(index)}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-sm"
                      style={{
                        color: "var(--ink)",
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {category.name}
                    </span>
                    <span
                      className="text-xs font-mono tabular-nums"
                      style={{ color: "var(--ink-4)" }}
                    >
                      {category.renderers.length}
                    </span>
                  </div>
                  {isActive && (
                    <div className="mt-2 space-y-1">
                      {category.renderers.map((renderer) => (
                        <div
                          key={renderer.rendererType}
                          className="text-xs pl-2"
                          style={{
                            color: "var(--ink-3)",
                            borderLeft: "2px solid var(--accent)",
                          }}
                        >
                          {renderer.label}
                        </div>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
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
