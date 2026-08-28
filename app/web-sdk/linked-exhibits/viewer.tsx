"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  DOCUMENT_DIR,
  DOCUMENTS,
  documentUrl,
  findDocument,
  INITIAL_DOCUMENT_ID,
  type LinkedDocument,
} from "./documents";
import {
  buildLinkAnnotation,
  crossReferenceTargets,
  type NutrientViewerLike,
  resolveLinkTarget,
} from "./link-navigation";
import "./styles.css";

/**
 * Search the open document for every OTHER document's reference phrase and
 * drop a LinkAnnotation over each match.
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

  for (const target of crossReferenceTargets(currentId)) {
    const results = await instance.search(target.referencePhrase);
    const uri = documentUrl(target);

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

export default function LinkedExhibitsViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  /** Incremented on every swap; a stale async load bails when it changes. */
  const loadGeneration = useRef(0);

  const [currentId, setCurrentId] = useState(INITIAL_DOCUMENT_ID);
  const [history, setHistory] = useState<string[]>([]);
  const [linkCount, setLinkCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);

  /** Open a document and push the one being left onto the back stack. */
  const navigate = useCallback((targetId: string) => {
    setWarning(null);
    setCurrentId((previous) => {
      if (previous === targetId) return previous;
      setHistory((trail) => [...trail, previous]);
      return targetId;
    });
  }, []);

  const goBack = useCallback(() => {
    setHistory((trail) => {
      if (trail.length === 0) return trail;
      const target = trail[trail.length - 1];
      setWarning(null);
      setCurrentId(target);
      return trail.slice(0, -1);
    });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;
    const NV = NutrientViewer as unknown as NutrientViewerLike;
    const doc = findDocument(currentId);
    if (!doc) return;

    const generation = ++loadGeneration.current;
    let cancelled = false;

    setIsLoading(true);
    setLinkCount(null);

    // Unload any previous instance before mounting the next one. There is no
    // in-place document setter, so a swap is always unload() then load().
    NutrientViewer.unload(container);
    instanceRef.current = null;

    NutrientViewer.load({
      container,
      document: documentUrl(doc),
      useCDN: true,
      pageRendering: "next",
      // Second gate: URIAction's default is window.open. Returning false here
      // guarantees a missed press can never navigate away from the demo.
      onOpenURI: () => false,
    })
      .then(async (instance) => {
        if (cancelled || generation !== loadGeneration.current) {
          NutrientViewer.unload(container);
          return;
        }
        instanceRef.current = instance;

        instance.addEventListener("annotations.press", (event) => {
          const action = (
            event.annotation as unknown as { action?: { uri?: unknown } }
          ).action;
          const targetId = resolveLinkTarget({ action });

          if (targetId) {
            event.preventDefault?.();
            navigate(targetId);
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
        });

        const created = await createCrossReferenceLinks(
          instance,
          NV,
          currentId,
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
      NutrientViewer.unload(container);
      instanceRef.current = null;
    };
  }, [currentId, navigate]);

  const current = findDocument(currentId);

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
          {DOCUMENTS.map((doc: LinkedDocument) => (
            <button
              key={doc.id}
              type="button"
              className="doc-item"
              aria-current={doc.id === currentId}
              disabled={doc.id === currentId}
              onClick={() => navigate(doc.id)}
            >
              <span className="doc-item-title">{doc.title}</span>
              <span className="doc-item-meta">
                {doc.id === currentId
                  ? "Open"
                  : `Linked from “${doc.referencePhrase}”`}
              </span>
            </button>
          ))}
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
