"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import {
  buildMeasurementLine,
  buildPin,
  lineBoundingBox,
  type Measurement,
  type Point,
  pinCenter,
  pointDrifted,
  SEED_MEASUREMENT,
} from "./measurement";

const DOCUMENT = "/documents/floor-plan-layers.pdf";

type Mode =
  | { phase: "idle" }
  | { phase: "awaiting-a" }
  | {
      phase: "awaiting-b";
      pairId: string;
      pinAId: string;
      a: Point;
      pageIndex: number;
    };

export default function ConstructionMeasurementViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [mode, setMode] = useState<Mode>({ phase: "idle" });
  const modeRef = useRef<Mode>({ phase: "idle" });
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const measurementsRef = useRef<Measurement[]>([]);
  const creatingRef = useRef(false);
  const reconcilingRef = useRef(false);
  const cascadingDeleteRef = useRef(false);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    measurementsRef.current = measurements;
  }, [measurements]);

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
      toolbarItems: (NV.defaultToolbarItems ?? []).filter(
        (item: { type: string }) =>
          ["pager", "zoom-out", "zoom-in", "zoom-mode"].includes(item.type),
      ),
    })
      .then(async (instance: Instance) => {
        instanceRef.current = instance;

        // Seed one example measurement so the demo isn't empty on load. Runs
        // before listener registration below so this create doesn't trigger
        // the relink/reconcile handler.
        if (SEED_MEASUREMENT) {
          const pairId = crypto.randomUUID();
          const pageIndex = 0;
          // biome-ignore lint/suspicious/noExplicitAny: create() returns a union
          const created: any = await instance.create([
            buildPin(NV, {
              pairId,
              slot: "a",
              pageIndex,
              center: SEED_MEASUREMENT.a,
            }),
            buildPin(NV, {
              pairId,
              slot: "b",
              pageIndex,
              center: SEED_MEASUREMENT.b,
            }),
            buildMeasurementLine(NV, {
              pairId,
              pageIndex,
              a: SEED_MEASUREMENT.a,
              b: SEED_MEASUREMENT.b,
            }),
          ]);
          // biome-ignore lint/suspicious/noExplicitAny: inferred
          const pins = created.filter((x: any) => x.customData?.role === "pin");
          // biome-ignore lint/suspicious/noExplicitAny: inferred
          const line = created.find((x: any) => x.customData?.role === "line");
          // biome-ignore lint/suspicious/noExplicitAny: inferred
          const pinA = pins.find((x: any) => x.customData?.slot === "a");
          // biome-ignore lint/suspicious/noExplicitAny: inferred
          const pinB = pins.find((x: any) => x.customData?.slot === "b");
          if (pinA?.id && pinB?.id && line?.id) {
            setMeasurements([
              {
                pairId,
                pinAId: pinA.id as string,
                pinBId: pinB.id as string,
                lineId: line.id as string,
                pageIndex,
              },
            ]);
          }
        }

        // page.press delivers a point already in page space + we read the
        // current page index from the view state.
        // biome-ignore lint/suspicious/noExplicitAny: page.press typing is minimal
        instance.addEventListener("page.press" as any, (event: any) => {
          const point = event.point;
          if (!point) return;
          const current = modeRef.current;
          if (current.phase === "idle") return;
          // Guard against overlapping creates: a second page.press firing
          // while a create is still in flight (e.g. a rapid double-click)
          // would otherwise re-enter the same branch and issue a duplicate
          // instance.create(), racing or double-pairing pins/lines.
          if (creatingRef.current) return;
          const pageIndex = instance.viewState.currentPageIndex;
          const p: Point = { x: point.x, y: point.y };

          if (current.phase === "awaiting-a") {
            const pairId = crypto.randomUUID();
            creatingRef.current = true;
            (async () => {
              try {
                // biome-ignore lint/suspicious/noExplicitAny: create() returns a union
                const created: any = await instance.create(
                  buildPin(NV, { pairId, slot: "a", pageIndex, center: p }),
                );
                const pinA = created[0];
                if (!pinA?.id) return;
                setMode({
                  phase: "awaiting-b",
                  pairId,
                  pinAId: pinA.id as string,
                  a: p,
                  pageIndex,
                });
              } finally {
                creatingRef.current = false;
              }
            })();
            return;
          }

          if (
            current.phase === "awaiting-b" &&
            pageIndex === current.pageIndex
          ) {
            const { pairId, pinAId, a } = current;
            creatingRef.current = true;
            (async () => {
              try {
                // biome-ignore lint/suspicious/noExplicitAny: create() returns a union
                const created: any = await instance.create([
                  buildPin(NV, { pairId, slot: "b", pageIndex, center: p }),
                  buildMeasurementLine(NV, { pairId, pageIndex, a, b: p }),
                ]);
                const pinB = created.find(
                  // biome-ignore lint/suspicious/noExplicitAny: inferred
                  (x: any) => x.customData?.role === "pin",
                );
                const line = created.find(
                  // biome-ignore lint/suspicious/noExplicitAny: inferred
                  (x: any) => x.customData?.role === "line",
                );
                if (!pinB?.id || !line?.id) return;
                setMeasurements((prev) => [
                  ...prev,
                  {
                    pairId,
                    pinAId,
                    pinBId: pinB.id as string,
                    lineId: line.id as string,
                    pageIndex,
                  },
                ]);
                // Stay in measure mode so the user can place more.
                setMode({ phase: "awaiting-a" });
              } finally {
                creatingRef.current = false;
              }
            })();
          }
        });

        // biome-ignore lint/suspicious/noExplicitAny: annotations.change typing is minimal
        instance.addEventListener("annotations.change" as any, async () => {
          if (reconcilingRef.current) return;
          const NV = window.NutrientViewer;
          if (!NV) return;

          // biome-ignore lint/suspicious/noExplicitAny: annotation update type
          const updates: any[] = [];

          for (const m of measurementsRef.current) {
            const anns = (await instance.getAnnotations(m.pageIndex)).toArray();
            // biome-ignore lint/suspicious/noExplicitAny: annotation type
            const pinA: any = anns.find((a: any) => a.id === m.pinAId);
            // biome-ignore lint/suspicious/noExplicitAny: annotation type
            const pinB: any = anns.find((a: any) => a.id === m.pinBId);
            // biome-ignore lint/suspicious/noExplicitAny: annotation type
            const line: any = anns.find((a: any) => a.id === m.lineId);
            if (!pinA || !pinB || !line) continue; // dangling; skip

            const a = pinCenter(pinA.boundingBox);
            const b = pinCenter(pinB.boundingBox);
            const startDrift = pointDrifted(
              { x: line.startPoint.x, y: line.startPoint.y },
              a,
            );
            const endDrift = pointDrifted(
              { x: line.endPoint.x, y: line.endPoint.y },
              b,
            );
            if (!startDrift && !endDrift) continue;

            updates.push(
              line
                .set("startPoint", new NV.Geometry.Point(a))
                .set("endPoint", new NV.Geometry.Point(b))
                .set(
                  "boundingBox",
                  new NV.Geometry.Rect(lineBoundingBox(a, b)),
                ),
            );
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

            // Deleted annotations arrive in varied shapes; handle all.
            let deleted: unknown[] = [];
            if (Array.isArray(event?.annotations)) deleted = event.annotations;
            else if (event?.annotations?.toArray)
              deleted = event.annotations.toArray();
            else if (Array.isArray(event)) deleted = event;
            else if (event?.toArray) deleted = event.toArray();

            const deletedIds = new Set<string>();
            for (const ann of deleted) {
              // biome-ignore lint/suspicious/noExplicitAny: annotation shape varies
              const a = ann as any;
              if (a?.id != null) deletedIds.add(String(a.id));
              else if (typeof a === "string") deletedIds.add(a);
            }
            if (deletedIds.size === 0) return;

            const affected = measurementsRef.current.filter(
              (m) =>
                deletedIds.has(m.pinAId) ||
                deletedIds.has(m.pinBId) ||
                deletedIds.has(m.lineId),
            );
            if (affected.length === 0) return;

            const siblingIds: string[] = [];
            for (const m of affected) {
              for (const id of [m.pinAId, m.pinBId, m.lineId]) {
                if (!deletedIds.has(id)) siblingIds.push(id);
              }
            }

            if (siblingIds.length > 0) {
              cascadingDeleteRef.current = true;
              try {
                await instance.delete(siblingIds);
              } finally {
                setTimeout(() => {
                  cascadingDeleteRef.current = false;
                }, 0);
              }
            }

            const affectedIds = new Set(affected.map((m) => m.pairId));
            setMeasurements((prev) =>
              prev.filter((m) => !affectedIds.has(m.pairId)),
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

  // Esc cancels an in-progress measurement / exits mode.
  useEffect(() => {
    if (mode.phase === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMode({ phase: "idle" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode.phase]);

  const measuring = mode.phase !== "idle";
  const buttonLabel =
    mode.phase === "idle"
      ? "Measure distance"
      : mode.phase === "awaiting-a"
        ? "Click first point (Esc to cancel)"
        : "Click second point (Esc to cancel)";

  return (
    <div className="flex h-full">
      <div
        className="w-72 flex flex-col overflow-y-auto"
        style={{
          background: "var(--bg-elev)",
          borderRight: "1px solid var(--line)",
        }}
      >
        <div className="p-5 flex flex-col gap-3">
          <div
            className="panel-section"
            style={{ paddingTop: 0, marginBottom: -4 }}
          >
            Measurements
          </div>
          <button
            type="button"
            className="w-full px-4 py-2.5 text-sm font-semibold cursor-pointer transition-colors"
            style={{
              background: measuring ? "var(--accent)" : "var(--accent-tint)",
              color: measuring ? "var(--bg)" : "var(--accent)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--r-2)",
            }}
            onClick={() =>
              setMode((m) =>
                m.phase === "idle"
                  ? { phase: "awaiting-a" }
                  : { phase: "idle" },
              )
            }
          >
            {buttonLabel}
          </button>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--ink-3)" }}
          >
            Click{" "}
            <strong style={{ color: "var(--ink-2)" }}>Measure distance</strong>,
            then click two points on the plan. A measurement line with a live
            distance label is drawn between the pins.
          </p>

          <ul className="space-y-2" style={{ paddingLeft: 0, margin: 0 }}>
            {measurements.map((m, i) => (
              <li
                key={m.pairId}
                className="flex items-center justify-between gap-3 p-2"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-2)",
                  background: "var(--bg-elev)",
                  listStyle: "none",
                }}
              >
                <span className="text-sm" style={{ color: "var(--ink-2)" }}>
                  Measurement {i + 1}
                </span>
                <button
                  type="button"
                  className="text-sm cursor-pointer"
                  style={{ color: "var(--ink-4)" }}
                  aria-label={`Delete measurement ${i + 1}`}
                  onClick={async () => {
                    const instance = instanceRef.current;
                    if (!instance) return;
                    // Delete one annotation; the cascade handler removes the rest.
                    await instance.delete(m.lineId);
                  }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>

          {measurements.length > 0 && (
            <button
              type="button"
              className="panel-button"
              onClick={async () => {
                const instance = instanceRef.current;
                if (!instance) return;
                const ids = measurements.flatMap((m) => [
                  m.pinAId,
                  m.pinBId,
                  m.lineId,
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
                setMeasurements([]);
              }}
            >
              Clear all
            </button>
          )}

          <div
            className="text-xs leading-relaxed pt-3 mt-1"
            style={{
              color: "var(--ink-4)",
              borderTop: "1px solid var(--line)",
            }}
          >
            <div
              className="font-semibold mb-1"
              style={{ color: "var(--ink-3)" }}
            >
              How this works
            </div>
            Each pin is an <code>EllipseAnnotation</code>. The measurement is a{" "}
            <code>LineAnnotation</code> with a fixed{" "}
            <code>measurementScale</code>, and the SDK computes and renders the
            distance label. Dragging a pin fires <code>annotations.change</code>
            , and we recompute the line&apos;s endpoints from the pins&apos;
            centers.
          </div>
        </div>
      </div>
      <div style={{ flex: 1, position: "relative" }}>
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            cursor: measuring ? "crosshair" : "default",
          }}
        />
      </div>
    </div>
  );
}
