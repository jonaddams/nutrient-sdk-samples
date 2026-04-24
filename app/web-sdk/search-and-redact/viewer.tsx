"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

const DOCUMENT = "/documents/acme-bank.pdf";

export interface MarkOptions {
  presetKeys: string[];
  customTerms: string[];
  caseSensitive: boolean;
  searchInAnnotations: boolean;
  useRegex: boolean;
}

export interface MarkSummary {
  totalMarks: number;
  byQuery: {
    query: string;
    type: "preset" | "text" | "regex";
    count: number;
  }[];
}

export interface SearchAndRedactHandle {
  markForRedaction: (opts: MarkOptions) => Promise<MarkSummary>;
  clearMarks: () => Promise<number>;
  applyRedactions: () => Promise<void>;
  resetDocument: () => void;
  downloadRedacted: () => Promise<void>;
}

interface ViewerProps {
  onRedactionCountChange?: (count: number) => void;
  onApplied?: () => void;
}

const SearchAndRedactViewer = forwardRef<SearchAndRedactHandle, ViewerProps>(
  function SearchAndRedactViewer({ onRedactionCountChange, onApplied }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const instanceRef = useRef<Instance | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [isReady, setIsReady] = useState(false);

    const reportCount = useCallback(async () => {
      const inst = instanceRef.current;
      if (!inst) return;
      const { NutrientViewer } = window;
      if (!NutrientViewer) return;

      let total = 0;
      for (let page = 0; page < inst.totalPageCount; page++) {
        const annotations = await inst.getAnnotations(page);
        total += annotations.filter(
          (ann: unknown) =>
            ann instanceof NutrientViewer.Annotations.RedactionAnnotation,
        ).size;
      }
      onRedactionCountChange?.(total);
    }, [onRedactionCountChange]);

    useImperativeHandle(
      ref,
      () => ({
        async markForRedaction(opts) {
          const inst = instanceRef.current;
          const { NutrientViewer } = window;
          if (!inst || !NutrientViewer) {
            return { totalMarks: 0, byQuery: [] };
          }

          const byQuery: MarkSummary["byQuery"] = [];
          let totalMarks = 0;

          for (const presetKey of opts.presetKeys) {
            try {
              const ids = await inst.createRedactionsBySearch(
                presetKey as never,
                {
                  searchType: NutrientViewer.SearchType.PRESET,
                  searchInAnnotations: opts.searchInAnnotations,
                },
              );
              const count = ids.size;
              totalMarks += count;
              byQuery.push({ query: presetKey, type: "preset", count });
            } catch (err) {
              console.error(`Preset search failed for ${presetKey}:`, err);
              byQuery.push({ query: presetKey, type: "preset", count: 0 });
            }
          }

          for (const term of opts.customTerms) {
            try {
              const ids = await inst.createRedactionsBySearch(term, {
                searchType: opts.useRegex
                  ? NutrientViewer.SearchType.REGEX
                  : NutrientViewer.SearchType.TEXT,
                caseSensitive: opts.caseSensitive,
                searchInAnnotations: opts.searchInAnnotations,
              });
              const count = ids.size;
              totalMarks += count;
              byQuery.push({
                query: term,
                type: opts.useRegex ? "regex" : "text",
                count,
              });
            } catch (err) {
              console.error(`Search failed for "${term}":`, err);
              byQuery.push({
                query: term,
                type: opts.useRegex ? "regex" : "text",
                count: 0,
              });
            }
          }

          await reportCount();
          return { totalMarks, byQuery };
        },

        async clearMarks() {
          const inst = instanceRef.current;
          const { NutrientViewer } = window;
          if (!inst || !NutrientViewer) return 0;

          let removed = 0;
          for (let page = 0; page < inst.totalPageCount; page++) {
            const annotations = await inst.getAnnotations(page);
            const redactions = annotations.filter(
              (ann: unknown) =>
                ann instanceof NutrientViewer.Annotations.RedactionAnnotation,
            );
            for (const r of redactions.toArray()) {
              await inst.delete(r);
              removed++;
            }
          }
          await reportCount();
          return removed;
        },

        async applyRedactions() {
          const inst = instanceRef.current;
          if (!inst) return;
          await inst.applyRedactions();
          await reportCount();
          onApplied?.();
        },

        resetDocument() {
          setReloadKey((k) => k + 1);
          onRedactionCountChange?.(0);
        },

        async downloadRedacted() {
          const inst = instanceRef.current;
          if (!inst) return;
          const buffer = await inst.exportPDF();
          const blob = new Blob([buffer], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "acme-bank-redacted.pdf";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        },
      }),
      [reportCount, onApplied, onRedactionCountChange],
    );

    // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey intentionally re-triggers viewer load on reset
    useEffect(() => {
      const container = containerRef.current;
      if (!container || !window.NutrientViewer) return;

      const { NutrientViewer } = window;
      setIsReady(false);

      NutrientViewer.load({
        container,
        document: DOCUMENT,
        useCDN: true,
        pageRendering: "next",
        licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
        theme: window.matchMedia("(prefers-color-scheme: dark)").matches
          ? NutrientViewer.Theme.DARK
          : NutrientViewer.Theme.AUTO,
        toolbarItems: [
          ...(NutrientViewer.defaultToolbarItems ?? []),
          { type: "redact-rectangle" },
          { type: "redact-text-highlighter" },
        ],
      }).then((instance: Instance) => {
        instanceRef.current = instance;
        setIsReady(true);
      });

      return () => {
        instanceRef.current = null;
        setIsReady(false);
        NutrientViewer.unload(container);
      };
    }, [reloadKey]);

    return (
      <div style={{ position: "relative", height: "100%" }}>
        {!isReady && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#888",
              fontSize: 13,
              pointerEvents: "none",
            }}
          >
            Loading document…
          </div>
        )}
        <div ref={containerRef} style={{ height: "100%" }} />
      </div>
    );
  },
);

export default SearchAndRedactViewer;
