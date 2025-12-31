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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(date);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar with saved states */}
      <aside className="w-80 bg-white dark:bg-[#1a1414] border-r border-[var(--warm-gray-400)] overflow-y-auto flex flex-col">
        <div className="p-4">
          <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">
            Saved States
          </h2>

          {savedStates.length === 0 ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No saved states yet. Make some annotations and click "Save
              Annotation State" to create your first saved state.
            </p>
          ) : (
            <ul className="space-y-1">
              {savedStates.map((state, index) => (
                <li key={state.key}>
                  <button
                    type="button"
                    onClick={() => handleStateClick(state.key)}
                    className={`w-full text-left px-3 py-2 rounded border transition-all ${
                      selectedState === state.key
                        ? "bg-[#bb2324] text-white border-[#bb2324]"
                        : "bg-white dark:bg-[#2a2020] border-[var(--warm-gray-400)] hover:border-[var(--digital-pollen)] text-gray-900 dark:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {/* Version number */}
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          selectedState === state.key
                            ? "bg-white text-[#bb2324]"
                            : "bg-gray-100 dark:bg-[#1a1414] text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {savedStates.length - index}
                      </div>

                      {/* State info */}
                      <div className="flex-1 min-w-0">
                        <div
                          className={`font-medium text-sm ${
                            selectedState === state.key
                              ? "text-white"
                              : "text-gray-900 dark:text-white"
                          }`}
                        >
                          {getRelativeTime(state.timestamp)}
                        </div>
                        <div
                          className={`text-xs ${
                            selectedState === state.key
                              ? "text-white opacity-80"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {formatTime(state.timestamp)}
                        </div>
                      </div>
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
