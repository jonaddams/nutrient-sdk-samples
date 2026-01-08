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
      const NutrientViewer = (
        window as typeof window & {
          NutrientViewer?: {
            load: (config: unknown) => Promise<Instance>;
            unload: (container: HTMLElement) => Promise<void>;
          };
        }
      ).NutrientViewer;

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
          licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
          officeConversionSettings: {
            documentMarkupMode: markupMode,
          },
        });

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
      <div className="mb-6 p-4 border border-[var(--warm-gray-400)] rounded-lg bg-white dark:bg-[#2a2020]">
        <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Document Markup Mode
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {markupModes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => handleModeChange(mode.value)}
              disabled={isLoading}
              className={`p-3 rounded-lg border-2 transition-all text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedMode === mode.value
                  ? "border-[var(--digital-pollen)] bg-[var(--digital-pollen)] dark:border-[#d4a574] dark:bg-[#2d2418]"
                  : "border-[var(--warm-gray-400)] hover:border-[var(--digital-pollen)] hover:bg-[var(--warm-gray-200)] dark:hover:bg-[#3a3030]"
              }`}
            >
              <div className="flex items-start">
                <div
                  className={`w-4 h-4 rounded-full border-2 mt-0.5 mr-2 flex-shrink-0 ${
                    selectedMode === mode.value
                      ? "border-(--black) dark:border-white bg-(--black) dark:bg-white"
                      : "border-[var(--warm-gray-400)]"
                  }`}
                >
                  {selectedMode === mode.value && (
                    <div className="w-full h-full rounded-full bg-(--digital-pollen) scale-50" />
                  )}
                </div>
                <div className="flex-1">
                  <div
                    className={`font-semibold text-sm mb-1 ${
                      selectedMode === mode.value
                        ? "text-(--black) dark:text-white"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {mode.label}
                  </div>
                  <div
                    className={`text-xs ${
                      selectedMode === mode.value
                        ? "text-gray-900 dark:text-gray-300"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {mode.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="absolute inset-0 bg-white dark:bg-[#1a1414] bg-opacity-80 flex items-center justify-center z-10">
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
