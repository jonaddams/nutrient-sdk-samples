"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import "./styles.css";

const DOCUMENT = "/documents/Drawing1.pdf";
const MARKER_SIZE = 30;

type Marker = {
  id: string;
  number: number;
  pageIndex: number;
  x: number;
  y: number;
};

export default function CountingAnnotationsViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const counterRef = useRef(0);
  const [markers, setMarkers] = useState<Marker[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      toolbarItems: [
        ...(NutrientViewer.defaultToolbarItems ?? []).filter(
          (item: { type: string }) =>
            [
              "pager",
              "zoom-out",
              "zoom-in",
              "zoom-mode",
              "search",
            ].includes(item.type),
        ),
      ],
      customRenderers: {
        Annotation: ({ annotation }: any) => {
          if (
            annotation instanceof NutrientViewer.Annotations.NoteAnnotation &&
            annotation.text?.value
          ) {
            const number = annotation.text.value;
            const node = document.createElement("div");
            node.style.cssText = `
              width: ${MARKER_SIZE}px;
              height: ${MARKER_SIZE}px;
              border-radius: 50%;
              background-color: #4537de;
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 13px;
              font-weight: 700;
              font-family: system-ui, -apple-system, sans-serif;
              box-shadow: 0 2px 6px rgba(69, 55, 222, 0.4);
              user-select: none;
              cursor: pointer;
            `;
            node.textContent = number;

            return {
              node,
              append: false,
            };
          }
          return null;
        },
      },
    }).then((instance: Instance) => {
      instanceRef.current = instance;

      instance.addEventListener("page.press" as any, (event: any) => {
        const point = event.point;
        if (!point) return;

        const pageIndex = instance.viewState.currentPageIndex;
        counterRef.current += 1;
        const number = counterRef.current;

        const halfSize = MARKER_SIZE / 2;
        const annotation =
          new NutrientViewer.Annotations.NoteAnnotation({
            pageIndex,
            boundingBox: new NutrientViewer.Geometry.Rect({
              left: point.x - halfSize,
              top: point.y - halfSize,
              width: MARKER_SIZE,
              height: MARKER_SIZE,
            }),
            text: { format: "plain" as const, value: String(number) },
            color: NutrientViewer.Color.fromHex("#4537de"),
          });

        instance.create(annotation).then((created: any) => {
          const createdAnnotation = Array.isArray(created)
            ? created[0]
            : created;
          setMarkers((prev) => [
            ...prev,
            {
              id: (createdAnnotation?.id ?? crypto.randomUUID()) as string,
              number,
              pageIndex,
              x: Math.round(point.x),
              y: Math.round(point.y),
            },
          ]);
        });
      });

      instance.addEventListener("annotations.delete" as any, (event: any) => {
        const deletedIds = new Set<string>();
        if (event?.annotations) {
          for (const ann of event.annotations) {
            if (ann?.id) deletedIds.add(ann.id);
          }
        }
        if (deletedIds.size > 0) {
          setMarkers((prev) =>
            prev.filter((m) => !deletedIds.has(m.id)),
          );
        }
      });
    });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, []);

  const handleMarkerClick = useCallback((marker: Marker) => {
    const instance = instanceRef.current;
    const NV = window.NutrientViewer;
    if (!instance || !NV) return;

    const halfSize = MARKER_SIZE / 2;
    instance.jumpToRect(
      marker.pageIndex,
      new NV.Geometry.Rect({
        left: marker.x - halfSize - 50,
        top: marker.y - halfSize - 50,
        width: MARKER_SIZE + 100,
        height: MARKER_SIZE + 100,
      }),
    );
  }, []);

  const handleReset = useCallback(async () => {
    const instance = instanceRef.current;
    const NV = window.NutrientViewer;
    if (!instance || !NV) return;

    const totalPages = instance.totalPageCount;
    const noteAnnotationIds: string[] = [];

    for (let i = 0; i < totalPages; i++) {
      const annotations = await instance.getAnnotations(i);
      for (const ann of annotations.toArray()) {
        if (ann instanceof NV.Annotations.NoteAnnotation) {
          noteAnnotationIds.push(ann.id as string);
        }
      }
    }

    for (const id of noteAnnotationIds) {
      await instance.delete(id);
    }

    counterRef.current = 0;
    setMarkers([]);
  }, []);

  return (
    <div className="counting-wrapper">
      <div className="counting-sidebar">
        {/* Count Display */}
        <div className="counting-section">
          <div className="counting-label">Total Markers</div>
          <div className="counting-total">
            <div className="counting-total-circle">{markers.length}</div>
            <div className="counting-total-text">
              {markers.length === 1
                ? "marker placed"
                : "markers placed"}
            </div>
          </div>
        </div>

        {/* Marker List */}
        <div className="counting-section" style={{ flex: 1, minHeight: 0 }}>
          <div className="counting-label">Placed Markers</div>
          {markers.length === 0 ? (
            <div className="marker-empty">
              Click anywhere on the document to place numbered markers
            </div>
          ) : (
            <ul className="marker-list">
              {markers.map((marker) => (
                <li key={marker.id}>
                  <button
                    type="button"
                    className="marker-item"
                    onClick={() => handleMarkerClick(marker)}
                  >
                    <div className="marker-circle">{marker.number}</div>
                    <div className="marker-details">
                      <span className="marker-page">
                        Page {marker.pageIndex + 1}
                      </span>
                      <span className="marker-coords">
                        ({marker.x}, {marker.y})
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Reset */}
        <button
          type="button"
          className="counting-reset-btn"
          onClick={handleReset}
          disabled={markers.length === 0}
        >
          Reset All
        </button>
      </div>

      <section className="counting-viewer">
        <div
          ref={containerRef}
          style={{ width: "100%", height: "100%" }}
        />
      </section>
    </div>
  );
}
