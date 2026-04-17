"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildCalloutAnnotations,
  type Callout,
  computeBubbleCenter,
  leaderBoundingBox,
  type Point,
  pointDrifted,
  renderBubble,
  SEED_CALLOUTS,
} from "./callouts";

const DOCUMENT = "/documents/floor-plan-layers.pdf";
const SEED_PAGE_INDEX = 0;

export default function NumberedCalloutsViewer() {
  type PlaceMode =
    | { phase: "idle" }
    | { phase: "awaiting-tip" }
    | { phase: "awaiting-bubble"; tipPoint: Point; pageIndex: number };

  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [callouts, setCallouts] = useState<Callout[]>([]);
  const [placeMode, setPlaceMode] = useState<PlaceMode>({ phase: "idle" });
  const [nextNumber, setNextNumber] = useState(SEED_CALLOUTS.length + 1);
  const placeModeRef = useRef<PlaceMode>({ phase: "idle" });
  const nextNumberRef = useRef(SEED_CALLOUTS.length + 1);
  const reconcilingRef = useRef(false);
  const cascadingDeleteRef = useRef(false);
  const calloutsRef = useRef<Callout[]>([]);

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

        // biome-ignore lint/suspicious/noExplicitAny: page.press event typing is minimal
        instance.addEventListener("page.press" as any, (event: any) => {
          const point = event.point;
          if (!point) return;
          const pageIndex = instance.viewState.currentPageIndex;
          const mode = placeModeRef.current;

          if (mode.phase === "awaiting-tip") {
            setPlaceMode({
              phase: "awaiting-bubble",
              tipPoint: { x: point.x, y: point.y },
              pageIndex,
            });
            return;
          }

          if (
            mode.phase === "awaiting-bubble" &&
            pageIndex === mode.pageIndex
          ) {
            const calloutId = crypto.randomUUID();
            const number = nextNumberRef.current;
            setNextNumber((n) => n + 1);

            const { bubble, leader } = buildCalloutAnnotations(NV, {
              calloutId,
              number,
              pageIndex,
              bubbleCenter: { x: point.x, y: point.y },
              tipPoint: mode.tipPoint,
            });

            (async () => {
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
              if (!bubbleAnn?.id || !leaderAnn?.id) return;

              setCallouts((prev) => [
                ...prev,
                {
                  calloutId,
                  number,
                  description: `Callout #${number}`,
                  bubbleAnnotationId: bubbleAnn.id as string,
                  leaderAnnotationId: leaderAnn.id as string,
                  pageIndex,
                },
              ]);
              setPlaceMode({ phase: "idle" });
            })();
          }
        });

        // biome-ignore lint/suspicious/noExplicitAny: annotation change event typing is minimal
        instance.addEventListener("annotations.change" as any, async () => {
          if (reconcilingRef.current) return;
          const NV = window.NutrientViewer;
          if (!NV) return;

          const pageIndex = instance.viewState.currentPageIndex;
          const annotations = (
            await instance.getAnnotations(pageIndex)
          ).toArray();

          // biome-ignore lint/suspicious/noExplicitAny: annotation type
          const bubbles = new Map<string, any>();
          // biome-ignore lint/suspicious/noExplicitAny: annotation type
          const leaders = new Map<string, any>();
          for (const a of annotations) {
            const cd = a.customData;
            if (!cd?.calloutId) continue;
            const calloutId = cd.calloutId as string;
            if (cd.role === "bubble") bubbles.set(calloutId, a);
            if (cd.role === "leader") leaders.set(calloutId, a);
          }

          // biome-ignore lint/suspicious/noExplicitAny: annotation update type
          const updates: any[] = [];
          for (const [calloutId, bubble] of bubbles) {
            const leader = leaders.get(calloutId);
            if (!leader) continue;

            const bubbleCenter = computeBubbleCenter(bubble.boundingBox);
            const currentStart: Point = {
              x: leader.startPoint.x,
              y: leader.startPoint.y,
            };
            const currentEnd: Point = {
              x: leader.endPoint.x,
              y: leader.endPoint.y,
            };

            if (pointDrifted(currentStart, bubbleCenter)) {
              const newBbox = leaderBoundingBox(bubbleCenter, currentEnd);
              const updated = leader
                .set("startPoint", new NV.Geometry.Point(bubbleCenter))
                .set("boundingBox", new NV.Geometry.Rect(newBbox));
              updates.push(updated);
            } else {
              const expectedBbox = leaderBoundingBox(currentStart, currentEnd);
              const lbb = leader.boundingBox;
              if (
                Math.abs(lbb.left - expectedBbox.left) > 0.5 ||
                Math.abs(lbb.top - expectedBbox.top) > 0.5 ||
                Math.abs(lbb.width - expectedBbox.width) > 0.5 ||
                Math.abs(lbb.height - expectedBbox.height) > 0.5
              ) {
                updates.push(
                  leader.set("boundingBox", new NV.Geometry.Rect(expectedBbox)),
                );
              }
            }
          }

          if (updates.length > 0) {
            reconcilingRef.current = true;
            try {
              await instance.update(updates);
            } finally {
              setTimeout(() => {
                reconcilingRef.current = false;
              }, 0);
            }
          }
        });

        instance.addEventListener(
          // biome-ignore lint/suspicious/noExplicitAny: delete event typing is minimal
          "annotations.delete" as any,
          // biome-ignore lint/suspicious/noExplicitAny: delete event typing is minimal
          async (event: any) => {
            if (cascadingDeleteRef.current) return;

            // Nutrient delivers the deleted annotations as an Immutable List
            // directly on `event` (accessed via .toArray()) rather than
            // under `event.annotations` — handle both shapes defensively.
            let deleted: unknown[] = [];
            if (Array.isArray(event?.annotations)) {
              deleted = event.annotations;
            } else if (event?.annotations?.toArray) {
              deleted = event.annotations.toArray();
            } else if (Array.isArray(event)) {
              deleted = event;
            } else if (event?.toArray) {
              deleted = event.toArray();
            }

            const deletedIds = new Set<string>();
            for (const ann of deleted) {
              // biome-ignore lint/suspicious/noExplicitAny: annotation shape varies
              const a = ann as any;
              if (a?.id != null) deletedIds.add(String(a.id));
              else if (typeof a === "string") deletedIds.add(a);
            }
            if (deletedIds.size === 0) return;

            // Match deletions against our callouts via annotation IDs —
            // customData on the event payload isn't reliably populated.
            const affected = calloutsRef.current.filter(
              (c) =>
                deletedIds.has(c.bubbleAnnotationId) ||
                deletedIds.has(c.leaderAnnotationId),
            );
            if (affected.length === 0) return;

            const siblingIdsToDelete: string[] = [];
            for (const c of affected) {
              if (!deletedIds.has(c.bubbleAnnotationId)) {
                siblingIdsToDelete.push(c.bubbleAnnotationId);
              }
              if (!deletedIds.has(c.leaderAnnotationId)) {
                siblingIdsToDelete.push(c.leaderAnnotationId);
              }
            }

            if (siblingIdsToDelete.length > 0) {
              cascadingDeleteRef.current = true;
              try {
                await instance.delete(siblingIdsToDelete);
              } finally {
                setTimeout(() => {
                  cascadingDeleteRef.current = false;
                }, 0);
              }
            }

            const affectedCalloutIds = new Set(
              affected.map((c) => c.calloutId),
            );
            setCallouts((prev) =>
              prev.filter((c) => !affectedCalloutIds.has(c.calloutId)),
            );
          },
        );
      })
      .catch((error: Error) => {
        console.error("Error loading viewer:", error);
      });

    return () => {
      instanceRef.current = null;
      NV.unload(container);
    };
  }, []);

  useEffect(() => {
    placeModeRef.current = placeMode;
  }, [placeMode]);

  useEffect(() => {
    nextNumberRef.current = nextNumber;
  }, [nextNumber]);

  useEffect(() => {
    calloutsRef.current = callouts;
  }, [callouts]);

  useEffect(() => {
    if (placeMode.phase === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPlaceMode({ phase: "idle" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [placeMode.phase]);

  const focusCallout = useCallback((callout: Callout) => {
    const instance = instanceRef.current;
    const NV = window.NutrientViewer;
    if (!instance || !NV) return;

    (async () => {
      const annotations = await instance.getAnnotations(callout.pageIndex);
      const bubble = annotations.toArray().find(
        // biome-ignore lint/suspicious/noExplicitAny: annotation type
        (a: any) =>
          a.customData?.calloutId === callout.calloutId &&
          a.customData?.role === "bubble",
      );
      if (!bubble) return;

      const bbox = bubble.boundingBox;
      const padded = new NV.Geometry.Rect({
        left: bbox.left - 60,
        top: bbox.top - 60,
        width: bbox.width + 120,
        height: bbox.height + 120,
      });
      instance.jumpToRect(callout.pageIndex, padded);

      const withHighlight = bubble.set("customData", {
        ...bubble.customData,
        highlightVersion: Date.now(),
      });
      await instance.update(withHighlight);

      setTimeout(async () => {
        const current = (await instance.getAnnotations(callout.pageIndex))
          .toArray()
          // biome-ignore lint/suspicious/noExplicitAny: annotation type
          .find((a: any) => a.id === bubble.id);
        if (!current) return;
        const cleared = current.set("customData", {
          ...current.customData,
          highlightVersion: undefined,
        });
        await instance.update(cleared);
      }, 1600);
    })();
  }, []);

  const updateDescription = useCallback(
    (calloutId: string, description: string) => {
      setCallouts((prev) =>
        prev.map((c) =>
          c.calloutId === calloutId ? { ...c, description } : c,
        ),
      );
    },
    [],
  );

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col overflow-y-auto">
        <div className="p-5 flex flex-col gap-3">
          <button
            type="button"
            className="w-full rounded-lg border-2 border-[var(--digital-pollen)] bg-[var(--digital-pollen)]/10 px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white hover:bg-[var(--digital-pollen)]/20 cursor-pointer"
            onClick={() => {
              setPlaceMode((m) =>
                m.phase === "idle"
                  ? { phase: "awaiting-tip" }
                  : { phase: "idle" },
              );
            }}
          >
            {placeMode.phase === "idle"
              ? "+ Add Callout"
              : placeMode.phase === "awaiting-tip"
                ? "Click to set arrow tip (Esc to cancel)"
                : "Click to place bubble (Esc to cancel)"}
          </button>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Click <strong>Add Callout</strong>, then click once on the drawing
            to set the arrow tip and again to place the bubble.
          </p>

          <ul className="space-y-2 pl-0!">
            {callouts.map((c) => (
              <li
                key={c.calloutId}
                className="flex items-start gap-3 rounded border border-[var(--warm-gray-400)] p-2"
              >
                <button
                  type="button"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#dc2626] text-xs font-semibold text-white cursor-pointer"
                  onClick={() => focusCallout(c)}
                  aria-label={`Focus callout ${c.number}`}
                >
                  {c.number}
                </button>
                <input
                  type="text"
                  value={c.description}
                  onChange={(e) =>
                    updateDescription(c.calloutId, e.target.value)
                  }
                  className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white leading-snug border-none outline-none focus:ring-1 focus:ring-[var(--digital-pollen)] rounded px-1"
                  aria-label={`Description for callout ${c.number}`}
                />
                <button
                  type="button"
                  className="text-gray-400 hover:text-red-600 text-sm cursor-pointer"
                  onClick={async () => {
                    const instance = instanceRef.current;
                    if (!instance) return;
                    await instance.delete(c.bubbleAnnotationId);
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
              onClick={async () => {
                const instance = instanceRef.current;
                if (!instance) return;
                const ids = callouts.flatMap((c) => [
                  c.bubbleAnnotationId,
                  c.leaderAnnotationId,
                ]);
                if (ids.length === 0) return;
                cascadingDeleteRef.current = true;
                try {
                  await instance.delete(ids);
                } finally {
                  setTimeout(() => {
                    cascadingDeleteRef.current = false;
                  }, 0);
                }
                setCallouts([]);
                setNextNumber(1);
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
      <div style={{ flex: 1, position: "relative" }}>
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            cursor: placeMode.phase === "idle" ? "default" : "crosshair",
          }}
        />
      </div>
    </div>
  );
}
