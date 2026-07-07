"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import {
  buildMeasurementLine,
  buildPin,
  type Measurement,
  type Point,
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
      .then((instance: Instance) => {
        instanceRef.current = instance;

        // page.press delivers a point already in page space + we read the
        // current page index from the view state.
        // biome-ignore lint/suspicious/noExplicitAny: page.press typing is minimal
        instance.addEventListener("page.press" as any, (event: any) => {
          const point = event.point;
          if (!point) return;
          const current = modeRef.current;
          if (current.phase === "idle") return;
          const pageIndex = instance.viewState.currentPageIndex;
          const p: Point = { x: point.x, y: point.y };

          if (current.phase === "awaiting-a") {
            const pairId = crypto.randomUUID();
            (async () => {
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
            })();
            return;
          }

          if (
            current.phase === "awaiting-b" &&
            pageIndex === current.pageIndex
          ) {
            const { pairId, pinAId, a } = current;
            (async () => {
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
            })();
          }
        });
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
