"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import {
  buildCalloutAnnotations,
  type Callout,
  renderBubble,
  SEED_CALLOUTS,
} from "./callouts";

const DOCUMENT = "/documents/floor-plan-layers.pdf";
const SEED_PAGE_INDEX = 0;

export default function NumberedCalloutsViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [nextNumber, _setNextNumber] = useState(SEED_CALLOUTS.length + 1);

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
      styleSheets: ["/numbered-callouts.css"],
      customRenderers: {
        // biome-ignore lint/suspicious/noExplicitAny: annotation type not fully available
        Annotation: ({ annotation }: any) => renderBubble(annotation),
      },
    })
      .then(async (instance: Instance) => {
        instanceRef.current = instance;

        const seeded: Callout[] = [];
        for (const seed of SEED_CALLOUTS) {
          const calloutId = crypto.randomUUID();
          const { bubble, leader } = buildCalloutAnnotations(NV, {
            calloutId,
            number: seed.number,
            pageIndex: SEED_PAGE_INDEX,
            bubbleCenter: seed.bubble,
            tipPoint: seed.tip,
          });
          // biome-ignore lint/suspicious/noExplicitAny: create() returns a union
          const created: any = await instance.create([bubble, leader]);
          const bubbleAnn = created.find(
            // biome-ignore lint/suspicious/noExplicitAny: inferred
            (a: any) => a.customData?.role === "bubble",
          );
          const leaderAnn = created.find(
            // biome-ignore lint/suspicious/noExplicitAny: inferred
            (a: any) => a.customData?.role === "leader",
          );
          if (!bubbleAnn?.id || !leaderAnn?.id) continue;
          seeded.push({
            calloutId,
            number: seed.number,
            description: seed.description,
            bubbleAnnotationId: bubbleAnn.id as string,
            leaderAnnotationId: leaderAnn.id as string,
            pageIndex: SEED_PAGE_INDEX,
          });
        }
        setCallouts(seeded);
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
      {/* Sidebar */}
      <div className="w-72 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col overflow-y-auto">
        <div className="p-5 flex flex-col gap-3">
          <button
            type="button"
            className="w-full rounded-lg border-2 border-[var(--digital-pollen)] bg-[var(--digital-pollen)]/10 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:bg-[var(--digital-pollen)]/20 cursor-pointer"
            onClick={() => {
              /* placement wired in Task 9 */
            }}
          >
            + Add Callout
          </button>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click <strong>Add Callout</strong>, then click once on the drawing
            to place the bubble and again to set the arrow tip.
          </p>

          <ul className="space-y-2">
            {callouts.map((c) => (
              <li
                key={c.calloutId}
                className="flex items-start gap-3 rounded border border-[var(--warm-gray-400)] p-2"
              >
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dc2626] text-xs font-semibold text-white cursor-pointer"
                  onClick={() => {
                    /* click-to-focus wired in Task 7 */
                  }}
                  aria-label={`Focus callout ${c.number}`}
                >
                  {c.number}
                </button>
                <span className="text-sm text-gray-900 dark:text-white leading-snug flex-1">
                  {c.description}
                </span>
                <button
                  type="button"
                  className="text-gray-400 hover:text-red-600 text-sm cursor-pointer"
                  onClick={() => {
                    /* delete wired in Task 11 */
                  }}
                  aria-label={`Delete callout ${c.number}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {callouts.length > 0 && (
            <button
              type="button"
              className="w-full rounded border border-[var(--warm-gray-400)] px-3 py-2 text-xs text-gray-600 dark:text-gray-400 hover:text-red-600 hover:border-red-600 cursor-pointer"
              onClick={() => {
                /* clear-all wired in Task 11 */
              }}
            >
              Clear all
            </button>
          )}

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Next number: #{nextNumber}
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
