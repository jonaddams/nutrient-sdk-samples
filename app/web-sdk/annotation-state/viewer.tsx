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

  // Initialize viewer (reload when instantJSON changes to apply saved state)
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
    const exportButton = {
      type: "custom" as const,
      id: "export-state",
      title: "Save State",
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

  const handleDeleteState = (
    key: string,
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.stopPropagation(); // Prevent triggering handleStateClick
    localStorage.removeItem(key);
    setSavedStates((prev) => prev.filter((state) => state.key !== key));

    // If we deleted the currently selected state, clear the selection
    if (selectedState === key) {
      setSelectedState(null);
      setInstantJSON(null);
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
          <h2
            className="mb-4 text-gray-900 dark:text-white"
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            Saved States
          </h2>

          {savedStates.length === 0 ? (
            <p
              className="text-sm text-gray-600 dark:text-gray-400"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              No saved states yet. Make some annotations and click "Save State"
              to create your first saved state.
            </p>
          ) : (
            <ul
              className="space-y-1 w-full list-none m-0"
              style={{ paddingLeft: 0 }}
            >
              {savedStates.map((state, index) => (
                <li key={state.key}>
                  <div
                    className={`flex items-center gap-2 px-3 py-2 rounded border transition-all ${
                      selectedState === state.key
                        ? "bg-(--data-green) text-white border-(--data-green)"
                        : "bg-white dark:bg-[#2a2020] border-[var(--warm-gray-400)] hover:border-[var(--digital-pollen)] text-gray-900 dark:text-white"
                    }`}
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    <button
                      type="button"
                      onClick={() => handleStateClick(state.key)}
                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                    >
                      {/* Version number */}
                      <div
                        className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          selectedState === state.key
                            ? "bg-white text-(--data-green)"
                            : "bg-gray-100 dark:bg-[#1a1414] text-gray-600 dark:text-gray-400"
                        }`}
                        style={{ fontFamily: "var(--font-mono)" }}
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
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {getRelativeTime(state.timestamp)}
                        </div>
                        <div
                          className={`text-xs ${
                            selectedState === state.key
                              ? "text-white opacity-80"
                              : "text-gray-500 dark:text-gray-400"
                          }`}
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {formatTime(state.timestamp)}
                        </div>
                      </div>
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteState(state.key, e)}
                      className={`shrink-0 p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer ${
                        selectedState === state.key
                          ? "hover:bg-white"
                          : "hover:bg-gray-200 dark:hover:bg-gray-700"
                      }`}
                      aria-label="Delete saved state"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
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
