"use client";
import type { Instance, ToolbarItem } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import type { IndexedCitation } from "../lib/citations";
import { getNutrientViewer } from "../lib/nutrient";
import { useCitationAnnotations } from "./useCitationAnnotations";

const LICENSE_KEY = process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY;

// Navigation only. Every annotation tool is deliberately omitted: citations ARE
// annotations, and an editing tool in reach lets a stray click delete the thing
// the demo exists to show. Names come from `defaultToolbarTypes` in the SDK
// types (index.d.ts:15740).
export const CITATION_TOOLBAR_ITEMS: ToolbarItem[] = [
  { type: "sidebar-thumbnails" },
  { type: "pager" },
  { type: "spacer" },
  { type: "pan" },
  { type: "zoom-out" },
  { type: "zoom-in" },
  { type: "zoom-mode" },
  { type: "spacer" },
  { type: "print" },
  { type: "export-pdf" },
];

export function DocViewer({
  docPath,
  citations,
  activeIndex,
  showCitations,
  onCitationPress,
}: {
  /** Public URL of the PDF, served by Next from public/. */
  docPath: string;
  citations: IndexedCitation[];
  activeIndex: number | null;
  showCitations: boolean;
  onCitationPress: (fieldIndex: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read the latest press callback from a ref so the listener registered at
  // load time never goes stale, and re-registering it is never necessary.
  const pressRef = useRef(onCitationPress);
  pressRef.current = onCitationPress;

  const { resolveFieldIndex, reset } = useCitationAnnotations({
    instanceRef,
    ready,
    citations,
    activeIndex,
    showCitations,
  });

  // ── Load the document. Deps are ONLY docPath: keying this on `citations` too
  // reloaded the whole document after every extraction, flashing the viewer.
  // biome-ignore lint/correctness/useExhaustiveDependencies: adding resolveFieldIndex and reset would be a no-op today — both are stable-identity — but the reload trigger has to stay `docPath` alone, and listing them would couple that trigger to a stability guarantee owned by another module, where a later edit could quietly turn it into a document reload.
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
        // ~15s at 100ms. The previous 5s was tight for a cold CDN cache on a
        // slow connection, and timing out shows the most alarming error in
        // the app — a false negative there is worse than waiting longer.
        if (retries++ < 150) {
          timeoutId = setTimeout(tryLoad, 100);
        } else {
          setError(
            "The Nutrient Web SDK didn't load. Check your network / CDN access and reload.",
          );
        }
        return;
      }
      NutrientViewer.load({
        container,
        document: docPath,
        licenseKey: LICENSE_KEY,
        useCDN: true,
        toolbarItems: CITATION_TOOLBAR_ITEMS,
      })
        .then((instance: Instance) => {
          if (cancelled) {
            NutrientViewer.unload(container);
            return;
          }
          instanceRef.current = instance;

          // Citations must stay *editable* for this to fire at all — the
          // SDK does not dispatch annotations.press for non-editable
          // annotations (index.d.ts:9752). preventDefault() suppresses the
          // default press action, which is selection; without selection
          // there are no drag or resize handles, so a citation is
          // read-only in practice while staying clickable.
          instance.addEventListener("annotations.press", (event) => {
            event.preventDefault?.();
            const fieldIndex = resolveFieldIndex(event.annotation?.id);
            if (fieldIndex != null) pressRef.current(fieldIndex);
          });

          setReady(true);
        })
        .catch((e: Error) => {
          if (cancelled) return;
          console.error("NutrientViewer load failed:", e);
          setError(
            `Couldn't load the document (${e.message}). Expected it at ${docPath} — check the path in lib/docs.ts matches a file under public/.`,
          );
        });
    };

    // Attempt immediately: on every document switch after the first, the global
    // is already present and the old unconditional 100ms wait was pure latency.
    // tryLoad reschedules itself when the global is not there yet.
    tryLoad();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      const NutrientViewer = getNutrientViewer();
      // `unload` destroys the annotation layer synchronously, outside the
      // mutation queue, even though a queued task may still be mid-`await`
      // against this same instance. That's safe only for two reasons, both
      // load-bearing and neither visible here: `reset()` right below is
      // enqueued, so it lands strictly behind whatever is already
      // in-flight rather than racing it; and every queued task closes over
      // its own captured `instance` (not a live ref read), so a task
      // straggling past this unload can't be confused about which
      // instance it's operating on. Reordering `reset()` above `unload()`,
      // or dropping `reset()` as a seemingly-redundant no-op, would break
      // this silently.
      if (NutrientViewer?.unload && container) NutrientViewer.unload(container);
      instanceRef.current = null;
      reset();
      setReady(false);
    };
  }, [docPath]);

  return (
    <div
      className="viewer"
      style={{ position: "relative", width: "100%", flex: 1, minHeight: 0 }}
    >
      <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />
      {error && (
        <div
          role="alert"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-6)",
            textAlign: "center",
          }}
        >
          <p className="muted">{error}</p>
        </div>
      )}
    </div>
  );
}
