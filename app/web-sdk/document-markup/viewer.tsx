"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";

interface ViewerProps {
  document: string | ArrayBuffer;
}

type DocumentMarkupMode =
  | "noMarkup"
  | "original"
  | "simpleMarkup"
  | "allMarkup";

interface MarkupModeOption {
  value: DocumentMarkupMode;
  label: string;
  description: string;
}

const markupModes: MarkupModeOption[] = [
  {
    value: "noMarkup",
    label: "No Markup",
    description:
      "Display the final document without any tracked changes or comments",
  },
  {
    value: "original",
    label: "Original",
    description: "Show the original document before any changes were made",
  },
  {
    value: "simpleMarkup",
    label: "Simple Markup",
    description:
      "Show a simplified view of changes with indicators in the margins",
  },
  {
    value: "allMarkup",
    label: "All Markup",
    description: "Display all tracked changes, deletions, and comments inline",
  },
];

export default function DocumentMarkupViewer({ document }: ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [selectedMode, setSelectedMode] =
    useState<DocumentMarkupMode>("allMarkup");
  const [isLoading, setIsLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  const loadDocument = useCallback(
    async (markupMode: DocumentMarkupMode) => {
      const container = containerRef.current;
      const NutrientViewer = window.NutrientViewer;

      if (!container || !NutrientViewer) {
        return;
      }

      setIsLoading(true);

      try {
        // Unload existing instance if present
        if (instanceRef.current) {
          await NutrientViewer.unload(container);
          instanceRef.current = null;
        }

        // Load new instance with the selected markup mode
        const loadedInstance: Instance = await NutrientViewer.load({
          container,
          document: document,
          useCDN: true,
          pageRendering: "next",
          licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
          officeConversionSettings: {
            documentMarkupMode: markupMode,
          },
        } as Parameters<typeof NutrientViewer.load>[0]);

        (
          window as typeof window & {
            instance?: Instance;
          }
        ).instance = loadedInstance;
        instanceRef.current = loadedInstance;
      } catch (error) {
        console.error("Error loading document:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [document],
  );

  useEffect(() => {
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadDocument(selectedMode);
    }

    return () => {
      const container = containerRef.current;
      const NutrientViewer = (
        window as typeof window & {
          NutrientViewer?: {
            unload: (container: HTMLElement) => Promise<void>;
          };
        }
      ).NutrientViewer;
      if (instanceRef.current && container && NutrientViewer) {
        NutrientViewer.unload(container);
        instanceRef.current = null;
      }
    };
  }, [loadDocument, selectedMode]);

  const handleModeChange = (mode: DocumentMarkupMode) => {
    setSelectedMode(mode);
    loadDocument(mode);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Markup Mode Controls */}
      <div
        className="mb-6 p-4"
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--line)",
          borderRadius: "var(--r-2)",
        }}
      >
        <div
          className="panel-section"
          style={{ paddingTop: 0, marginBottom: 12 }}
        >
          Document Markup Mode
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {markupModes.map((mode) => {
            const isActive = selectedMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                onClick={() => handleModeChange(mode.value)}
                disabled={isLoading}
                className="p-3 transition-all text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isActive
                    ? "var(--accent-tint)"
                    : "var(--bg-elev)",
                  border: `1px solid ${
                    isActive ? "var(--accent)" : "var(--line)"
                  }`,
                  borderRadius: "var(--r-2)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive && !isLoading) {
                    e.currentTarget.style.background = "var(--accent-tint)";
                    e.currentTarget.style.borderColor = "var(--accent)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive && !isLoading) {
                    e.currentTarget.style.background = "var(--bg-elev)";
                    e.currentTarget.style.borderColor = "var(--line)";
                  }
                }}
              >
                <div className="flex items-start">
                  {/* Radio dot */}
                  <div
                    className="w-4 h-4 rounded-full mt-0.5 mr-2 shrink-0 flex items-center justify-center"
                    style={{
                      border: `2px solid ${
                        isActive ? "var(--accent)" : "var(--ink-4)"
                      }`,
                    }}
                  >
                    {isActive && (
                      <div
                        className="rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          background: "var(--accent)",
                        }}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div
                      className="font-semibold text-sm mb-1"
                      style={{
                        color: isActive ? "var(--ink)" : "var(--ink)",
                      }}
                    >
                      {mode.label}
                    </div>
                    <div
                      className="text-xs"
                      style={{
                        color: isActive ? "var(--ink-2)" : "var(--ink-3)",
                      }}
                    >
                      {mode.description}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-opacity-80 flex items-center justify-center z-10" style={{ background: "var(--bg)" }}>
          <div className="text-center">
            <svg
              className="animate-spin h-10 w-10 mx-auto mb-3"
              style={{ color: "var(--digital-pollen)" }}
              fill="none"
              viewBox="0 0 24 24"
            >
              <title>Loading...</title>
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Loading document with{" "}
              {markupModes.find((m) => m.value === selectedMode)?.label}...
            </p>
          </div>
        </div>
      )}

      {/* Viewer Container */}
      <div
        ref={containerRef}
        className="flex-1 border border-[var(--warm-gray-400)] rounded-lg overflow-hidden"
        style={{ position: "relative" }}
      />
    </div>
  );
}
