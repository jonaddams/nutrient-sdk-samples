"use client";

import type {
  Instance,
  RectangleAnnotation,
  ToolbarItem,
} from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  appearance,
  type CitationStyle,
  styleFor,
} from "../_lib/citation-style";
import { getNutrientViewer } from "../_lib/nutrient";
import type { FieldCitation } from "../_lib/types";

const LICENSE_KEY = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY;

// Navigation only. Citations ARE annotations, so an editing tool within reach
// lets a stray click delete the thing this view exists to show.
const TOOLBAR: ToolbarItem[] = [
  { type: "sidebar-thumbnails" },
  { type: "pager" },
  { type: "spacer" },
  { type: "zoom-out" },
  { type: "zoom-in" },
  { type: "zoom-mode" },
];

export function CitationViewer({
  documentUrl,
  citations,
  activePath,
  onCitationPress,
}: {
  documentUrl: string;
  citations: Record<string, FieldCitation>;
  activePath: string | null;
  onCitationPress: (path: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Annotation id -> field path, so a press on the canvas can select the field.
  const annotationToPath = useRef(new Map<string, string>());
  // What each path was last painted with, so a restyle only touches what changed.
  const painted = useRef(new Map<string, CitationStyle>());

  const pressRef = useRef(onCitationPress);
  pressRef.current = onCitationPress;

  const resolvePath = useCallback(
    (annotationId?: string) =>
      annotationId
        ? (annotationToPath.current.get(annotationId) ?? null)
        : null,
    [],
  );

  // Load the document. Deps are ONLY documentUrl and the stable resolvePath:
  // adding `citations` would reload the whole document whenever the selection
  // changed, flashing the view on every click.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let retries = 0;
    setError(null);
    setReady(false);

    const tryLoad = () => {
      if (cancelled) return;
      const NutrientViewer = getNutrientViewer();
      if (!NutrientViewer) {
        // ~15s at 100ms. A cold CDN cache on a slow connection needs it, and a
        // false "SDK didn't load" is the most alarming error on the page.
        if (retries++ < 150) {
          timeoutId = setTimeout(tryLoad, 100);
          return;
        }
        setError(
          "The Nutrient Web SDK didn't load. Check CDN access and reload.",
        );
        return;
      }
      NutrientViewer.load({
        container,
        document: documentUrl,
        licenseKey: LICENSE_KEY,
        useCDN: true,
        toolbarItems: TOOLBAR,
      })
        .then((instance: Instance) => {
          if (cancelled) {
            NutrientViewer.unload(container);
            return;
          }
          instanceRef.current = instance;
          // Citations must stay EDITABLE for this to fire: the SDK does not
          // dispatch annotations.press for non-editable annotations.
          // preventDefault() suppresses selection, so there are no drag or
          // resize handles and a citation is read-only in practice while
          // remaining clickable.
          instance.addEventListener(
            "annotations.press",
            (event: {
              preventDefault?: () => void;
              annotation?: { id?: string };
            }) => {
              event.preventDefault?.();
              const path = resolvePath(event.annotation?.id);
              if (path) pressRef.current(path);
            },
          );
          setReady(true);
        })
        .catch((e: Error) => {
          if (cancelled) return;
          setError(`Couldn't load the document (${e.message}).`);
        });
    };

    tryLoad();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      const NutrientViewer = getNutrientViewer();
      if (NutrientViewer && containerRef.current) {
        NutrientViewer.unload(containerRef.current);
      }
      instanceRef.current = null;
      annotationToPath.current.clear();
      painted.current.clear();
    };
  }, [documentUrl, resolvePath]);

  // Draw the citations once the document is ready.
  // biome-ignore lint/correctness/useExhaustiveDependencies: activePath is handled by the restyle effect; rebuilding on every click would flicker the layer.
  useEffect(() => {
    const instance = instanceRef.current;
    const NutrientViewer = getNutrientViewer();
    if (!ready || !instance || !NutrientViewer) return;
    let cancelled = false;

    (async () => {
      const built: RectangleAnnotation[] = [];
      const paths: string[] = [];

      for (const [path, citation] of Object.entries(citations)) {
        // null for an out-of-range page. One bad citation must not cost the
        // whole highlight layer, so skip rather than throw.
        const info = instance.pageInfoForIndex(citation.page);
        if (!info) continue;
        const style = appearance(styleFor(path, activePath));

        // Every box, not just the first: ~8% of values span two text blocks, and
        // drawing only the merged bbox highlights more than the value.
        for (const b of citation.boxes) {
          try {
            built.push(
              new NutrientViewer.Annotations.RectangleAnnotation({
                pageIndex: citation.page,
                boundingBox: new NutrientViewer.Geometry.Rect({
                  left: b.x0 * info.width,
                  top: b.y0 * info.height,
                  width: (b.x1 - b.x0) * info.width,
                  height: (b.y1 - b.y0) * info.height,
                }),
                strokeColor: new NutrientViewer.Color(style.stroke),
                strokeWidth: style.strokeWidth,
                fillColor: new NutrientViewer.Color(style.fill),
                opacity: style.opacity,
              }) as RectangleAnnotation,
            );
            paths.push(path);
          } catch {
            // Skip this box; keep the rest of the layer.
          }
        }
      }

      if (cancelled || built.length === 0) return;
      const created = await instance.create(built);
      if (cancelled) return;

      annotationToPath.current.clear();
      created.forEach((ann, i) => {
        const id = (ann as { id?: string }).id;
        if (id && paths[i]) annotationToPath.current.set(id, paths[i]);
      });
      for (const p of paths) painted.current.set(p, styleFor(p, activePath));
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, citations]);

  // Restyle on selection, and scroll the selected citation into view.
  useEffect(() => {
    const instance = instanceRef.current;
    const NutrientViewer = getNutrientViewer();
    if (!ready || !instance || !NutrientViewer) return;

    (async () => {
      // Scroll to the citation itself, not merely its page — on a dense document
      // the page alone leaves the reader hunting. This is the headline of the
      // whole linkage, so it runs first and carries its own catch: a failed
      // restyle must never silently cancel the navigation.
      const active = activePath ? citations[activePath] : null;
      if (active) {
        try {
          const info = instance.pageInfoForIndex(active.page);
          if (info) {
            const b = active.boxes[0];
            instance.jumpToRect(
              active.page,
              new NutrientViewer.Geometry.Rect({
                left: b.x0 * info.width,
                top: b.y0 * info.height,
                width: (b.x1 - b.x0) * info.width,
                height: (b.y1 - b.y0) * info.height,
              }),
            );
          }
        } catch {
          // Navigation is best-effort.
        }
      }

      // Restyle only what changed. The first selection touches every citation
      // (base -> dimmed/active); each one after that touches exactly two, so one
      // code path covers both.
      const changed: string[] = [];
      for (const [, path] of annotationToPath.current) {
        if (painted.current.get(path) !== styleFor(path, activePath)) {
          changed.push(path);
        }
      }
      if (changed.length === 0) return;

      const byId = new Map(
        [...annotationToPath.current].map(([id, path]) => [id, path]),
      );
      const pages = new Set(
        changed
          .map((p) => citations[p]?.page)
          .filter((n): n is number => n != null),
      );

      const updates: RectangleAnnotation[] = [];
      for (const page of pages) {
        const onPage = await instance.getAnnotations(page).catch(() => null);
        if (!onPage) continue;
        onPage.forEach((ann) => {
          const id = (ann as { id?: string }).id;
          const path = id ? byId.get(id) : undefined;
          if (!path) return;
          const next = styleFor(path, activePath);
          if (painted.current.get(path) === next) return;
          const style = appearance(next);
          updates.push(
            (ann as RectangleAnnotation)
              .set("strokeColor", new NutrientViewer.Color(style.stroke))
              .set("strokeWidth", style.strokeWidth)
              .set("fillColor", new NutrientViewer.Color(style.fill))
              .set("opacity", style.opacity) as RectangleAnnotation,
          );
          painted.current.set(path, next);
        });
      }
      if (updates.length) await instance.update(updates);
    })();
  }, [ready, activePath, citations]);

  if (error) {
    return (
      <div className="rounded-2xl border border-[var(--danger, #e5484d)] p-4 text-sm">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-12rem)] min-h-[560px] w-full overflow-hidden rounded-2xl border border-[var(--line)]"
    />
  );
}
