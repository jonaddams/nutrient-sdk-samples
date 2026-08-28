"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  CROSS_REFERENCES,
  DOCUMENT_DIR,
  DOCUMENTS,
  documentUrl,
  findDocument,
  INITIAL_DOCUMENT_ID,
  type LinkedDocument,
} from "./documents";
import {
  buildLinkAnnotation,
  crossReferencesFrom,
  linkUri,
  type NutrientViewerLike,
  resolveLinkTarget,
} from "./link-navigation";
import "./styles.css";

/**
 * Search the open document for every cross-reference phrase that points
 * somewhere else, and drop a LinkAnnotation over each match.
 *
 * Runs after every load, because these annotations live in the viewer session
 * only — a fresh load() starts with none.
 */
async function createCrossReferenceLinks(
  instance: Instance,
  NV: NutrientViewerLike,
  currentId: string,
): Promise<number> {
  const annotations: unknown[] = [];

  for (const ref of crossReferencesFrom(currentId)) {
    const target = findDocument(ref.targetId);
    if (!target) continue;

    const results = await instance.search(ref.phrase);
    // The target page rides along as a #page= fragment on the link URI.
    const uri = linkUri(target, ref.page);

    for (const result of results.toArray()) {
      const pageIndex = result.pageIndex;
      if (pageIndex === null) continue;

      for (const rect of result.rectsOnPage.toArray()) {
        annotations.push(
          buildLinkAnnotation(NV, {
            pageIndex,
            rect: {
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            },
            uri,
          }),
        );
      }
    }
  }

  if (annotations.length === 0) return 0;
  // One create() call for the whole document, not one per link.
  await instance.create(annotations as never);
  return annotations.length;
}

/** How many links point at a given document from everywhere else. */
function inboundReferenceCount(docId: string): number {
  return CROSS_REFERENCES.filter((ref) => ref.targetId === docId).length;
}

type Destination = { id: string; hash: string | null };

export default function LinkedExhibitsViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  /** Incremented on every swap; a stale async load bails when it changes. */
  const loadGeneration = useRef(0);

  const [destination, setDestination] = useState<Destination>({
    id: INITIAL_DOCUMENT_ID,
    hash: null,
  });
  const { id: destinationId, hash: destinationHash } = destination;
  const [history, setHistory] = useState<Destination[]>([]);
  const [linkCount, setLinkCount] = useState<number | null>(null);
  const [pageLabel, setPageLabel] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  /** Open a destination and push the one being left onto the back stack. */
  const navigate = useCallback((next: Destination) => {
    setWarning(null);
    setDestination((previous) => {
      if (previous.id === next.id && previous.hash === next.hash) {
        return previous;
      }
      setHistory((trail) => [...trail, previous]);
      return next;
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory((trail) => {
      if (trail.length === 0) return trail;
      setWarning(null);
      setDestination(trail[trail.length - 1]);
      return trail.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;
    const NV = NutrientViewer as unknown as NutrientViewerLike;
    const doc = findDocument(destinationId);
    if (!doc) return;

    const generation = ++loadGeneration.current;
    let cancelled = false;
    /** Set once listeners are attached, so cleanup can detach them. */
    let detachListeners: (() => void) | null = null;

    setIsLoading(true);
    setLinkCount(null);
    setPageLabel(null);

    // Unload any previous instance before mounting the next one. There is no
    // in-place document setter, so a swap is always unload() then load().
    NutrientViewer.unload(container);
    instanceRef.current = null;

    // Turn "#page=2" into a view state, using the SDK's own open-parameter
    // parser rather than re-implementing the format here. Only `page` is
    // supported by it today, and an out-of-range page falls back to page 1.
    const initialViewState = destinationHash
      ? NutrientViewer.viewStateFromOpenParameters(
          new NutrientViewer.ViewState({}),
          destinationHash,
        )
      : undefined;

    NutrientViewer.load({
      container,
      document: documentUrl(doc),
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      useCDN: true,
      pageRendering: "next",
      ...(initialViewState ? { initialViewState } : null),
      // Second gate: the SDK renders a link annotation as an <a target="_blank">,
      // so a press the first gate misses would open the raw PDF in a new tab.
      onOpenURI: () => false,
    })
      .then(async (instance) => {
        if (cancelled || generation !== loadGeneration.current) {
          NutrientViewer.unload(container);
          return;
        }
        instanceRef.current = instance;

        /**
         * True only while this load is still the current one.
         *
         * Both listeners below need it. `unload()` does not guarantee that an
         * outgoing instance stops emitting, so without this guard a superseded
         * instance can still push a page label for the document it was showing,
         * or act on a press, using a `doc` its closure captured. That produced a
         * page label that reverted to the wrong value after a deep link.
         */
        const isCurrent = () =>
          !cancelled && generation === loadGeneration.current;

        const onPageChange = (pageIndex: number) => {
          if (!isCurrent()) return;
          setPageLabel(`page ${pageIndex + 1} of ${doc.pageCount}`);
        };
        onPageChange(instance.viewState.currentPageIndex);
        instance.addEventListener(
          "viewState.currentPageIndex.change",
          onPageChange,
        );

        const onAnnotationPress = (event: {
          annotation: unknown;
          preventDefault?: () => void;
        }) => {
          if (!isCurrent()) return;
          const action = (event.annotation as { action?: { uri?: unknown } })
            .action;
          const target = resolveLinkTarget({ action });

          if (target) {
            event.preventDefault?.();
            navigate(target);
            return;
          }

          // Not in the set. If it points into our own directory the link is
          // broken; anything else is an ordinary web link, left to the SDK.
          const uri = action?.uri;
          if (typeof uri === "string" && uri.includes(DOCUMENT_DIR)) {
            event.preventDefault?.();
            setWarning(
              `That link points to ${uri}, which is not one of the four documents in this set.`,
            );
          }
        };
        instance.addEventListener("annotations.press", onAnnotationPress);

        detachListeners = () => {
          instance.removeEventListener(
            "viewState.currentPageIndex.change",
            onPageChange,
          );
          instance.removeEventListener(
            "annotations.press",
            onAnnotationPress as never,
          );
        };

        const created = await createCrossReferenceLinks(
          instance,
          NV,
          destinationId,
        );
        if (cancelled || generation !== loadGeneration.current) return;
        setLinkCount(created);
        setIsLoading(false);
      })
      .catch((error: unknown) => {
        if (cancelled || generation !== loadGeneration.current) return;
        setIsLoading(false);
        setWarning(
          error instanceof Error
            ? `Could not load ${doc.title}: ${error.message}`
            : `Could not load ${doc.title}.`,
        );
      });

    return () => {
      cancelled = true;
      detachListeners?.();
      NutrientViewer.unload(container);
      instanceRef.current = null;
    };
    // Depend on the primitives, not the destination object: an equal-but-new
    // object (from goBack, or re-clicking a sidebar entry) would otherwise
    // tear down and reload the viewer for no reason.
  }, [destinationId, destinationHash, navigate]);

  const current = findDocument(destination.id);

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div
        style={{
          width: 300,
          flexShrink: 0,
          padding: "var(--space-4)",
          borderRight: "1px solid var(--line)",
          overflowY: "auto",
        }}
      >
        <div className="doc-list">
          {DOCUMENTS.map((doc: LinkedDocument) => {
            const isOpen = doc.id === destination.id;
            const inbound = inboundReferenceCount(doc.id);
            return (
              <button
                key={doc.id}
                type="button"
                className="doc-item"
                aria-current={isOpen}
                disabled={isOpen}
                onClick={() => navigate({ id: doc.id, hash: null })}
              >
                <span className="doc-item-title">{doc.title}</span>
                <span className="doc-item-meta">
                  {doc.pageCount} pages ·{" "}
                  {isOpen
                    ? "open"
                    : `${inbound} inbound link${inbound === 1 ? "" : "s"}`}
                </span>
              </button>
            );
          })}
        </div>

        <div className="doc-legend">
          <span className="doc-legend-title">Deep links in this set</span>
          <ul>
            {CROSS_REFERENCES.filter((ref) => ref.page > 1).map((ref) => (
              <li key={ref.phrase}>
                <code>{ref.phrase}</code> → {ref.targetDescription}
              </li>
            ))}
          </ul>
        </div>

        <p className="doc-note">
          Links are created at load time with <code>instance.create()</code> and
          live in this viewer session only. In production you would persist them
          as Instant JSON or bake them into the PDF server-side.
        </p>
      </div>

      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          padding: "var(--space-4)",
        }}
      >
        <div className="doc-trail">
          <button
            type="button"
            onClick={goBack}
            disabled={history.length === 0}
          >
            ← Back
          </button>
          <span>{current ? current.title : "—"}</span>
          {pageLabel && <span>· {pageLabel}</span>}
          {isLoading && <span>· loading…</span>}
          {!isLoading && linkCount !== null && (
            <span>
              · {linkCount} cross-reference link{linkCount === 1 ? "" : "s"}{" "}
              created
            </span>
          )}
        </div>

        {warning && <div className="doc-banner">{warning}</div>}

        <div
          ref={containerRef}
          style={{
            flex: 1,
            minHeight: 0,
            border: "1px solid var(--line)",
            borderRadius: "var(--r-2)",
            overflow: "hidden",
          }}
        />
      </div>
    </div>
  );
}
