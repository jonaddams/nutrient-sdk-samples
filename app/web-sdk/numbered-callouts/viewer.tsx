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
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Place numbered callouts on the floor plan and manage them from the
            list below.
          </p>

          <ul className="space-y-2 mt-2">
            {callouts.map((c) => (
              <li
                key={c.calloutId}
                className="flex items-start gap-3 rounded border border-[var(--warm-gray-400)] p-2"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dc2626] text-xs font-semibold text-white">
                  {c.number}
                </span>
                <span className="text-sm text-gray-900 dark:text-white leading-snug">
                  {c.description}
                </span>
              </li>
            ))}
          </ul>

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
