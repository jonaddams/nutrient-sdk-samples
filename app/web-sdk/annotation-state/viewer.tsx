"use client";

import type { Instance, InstantJSON } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY_PREFIX = "nutrient-annotation-state-";

interface SavedState {
  key: string;
  timestamp: Date;
}

export default function AnnotationStateViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const nutrientViewerRef = useRef<typeof window.NutrientViewer | null>(null);

  const [savedStates, setSavedStates] = useState<SavedState[]>([]);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [instantJSON, setInstantJSON] = useState<InstantJSON | null>(null);

  // Load saved states from localStorage on mount
  useEffect(() => {
    const keys = Object.keys(localStorage)
      .filter((key) => key.startsWith(STORAGE_KEY_PREFIX))
      .sort()
      .map((key) => ({
        key,
        timestamp: new Date(key.replace(STORAGE_KEY_PREFIX, "")),
      }));
    setSavedStates(keys);
  }, []);

  // Initialize viewer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!window.NutrientViewer) return;
    const { NutrientViewer } = window;

    nutrientViewerRef.current = NutrientViewer;

    // Unload any existing instance first (handles React Strict Mode double mount)
    try {
      NutrientViewer.unload(container);
    } catch {
      // Ignore errors if no instance exists
    }

    // Custom toolbar button to export annotation state
    const exportButton: typeof NutrientViewer.ToolbarItem = {
      type: "custom",
      id: "export-state",
      title: "Save Annotation State",
      onPress: async () => {
        if (!instanceRef.current) return;

        try {
          const json = await instanceRef.current.exportInstantJSON();
          const timestamp = new Date().toISOString();
          const key = `${STORAGE_KEY_PREFIX}${timestamp}`;

          localStorage.setItem(key, JSON.stringify(json));

          // Update saved states list
          setSavedStates((prev) => [
            ...prev,
            { key, timestamp: new Date(timestamp) },
          ]);
        } catch (error) {
          console.error("Failed to export annotation state:", error);
        }
      },
    };

    NutrientViewer.load({
      container,
      document: "/documents/blank.pdf",
      allowLinearizedLoading: true,
      useCDN: true,
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      toolbarItems: [
        ...NutrientViewer.defaultToolbarItems,
        { type: "spacer" },
        exportButton,
      ],
      instantJSON: instantJSON ?? undefined,
    })
      .then((instance) => {
        instanceRef.current = instance;
      })
      .catch((error) => {
        console.error("Failed to load Nutrient Viewer:", error);
      });

    return () => {
      if (instanceRef.current) {
        const NutrientViewer = nutrientViewerRef.current;
        if (NutrientViewer && container) {
          try {
            NutrientViewer.unload(container);
          } catch {
            // Ignore cleanup errors
          }
        }
        instanceRef.current = null;
      }
    };
  }, [instantJSON]);

  const handleStateClick = (key: string) => {
    const jsonData = localStorage.getItem(key);
    if (jsonData) {
      setInstantJSON(JSON.parse(jsonData) as InstantJSON);
      setSelectedState(key);
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Sidebar with saved states */}
      <aside className="w-80 bg-gray-100 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 overflow-y-auto">
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
            Saved Annotation States
          </h2>

          {savedStates.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No saved states yet. Make some annotations and click "Save
              Annotation State" to create your first saved state.
            </p>
          ) : (
            <ul className="space-y-3">
              {savedStates.map((state) => (
                <li key={state.key}>
                  <button
                    type="button"
                    onClick={() => handleStateClick(state.key)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedState === state.key
                        ? "bg-[#bb2324] text-white font-semibold"
                        : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    <div className="text-sm break-words">
                      {formatTimestamp(state.timestamp)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Main viewer area */}
      <main className="flex-1 overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />
      </main>
    </div>
  );
}
