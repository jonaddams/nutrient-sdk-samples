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

    // Custom toolbar button to export annotation state.
    // The SDK takes `icon` as a raw SVG string — the `xmlns` attribute is
    // required for it to render. Matches the night-mode sample's pattern.
    const SAVE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`;
    const exportButton = {
      type: "custom" as const,
      id: "export-state",
      title: "Save State",
      icon: SAVE_ICON,
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
      pageRendering: "next",
      useCDN: true,
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      instantJSON: instantJSON ?? undefined,
    })
      .then((instance) => {
        instanceRef.current = instance;

        // Insert our custom button right after `search` so it sits with the
        // other right-aligned action buttons (print, search, export-pdf).
        // Tacking it onto the end past two spacers + 40+ items overflows the
        // toolbar's visible width and the SDK silently clips it.
        instance.setToolbarItems((items: any[]) => {
          const next = [...items];
          // Drop the developer-only "debug" item if it's there.
          const debugIdx = next.findIndex((i) => i.id === "debug" || i.type === "debug");
          if (debugIdx >= 0) next.splice(debugIdx, 1);
          const searchIdx = next.findIndex((i) => i.id === "search" || i.type === "search");
          const insertAt = searchIdx >= 0 ? searchIdx + 1 : next.length;
          next.splice(insertAt, 0, exportButton);
          return next;
        });
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
      <aside
        className="w-80 overflow-y-auto flex flex-col"
        style={{
          background: "var(--surface)",
          borderRight: "1px solid var(--line)",
        }}
      >
        <div className="p-4">
          <h2
            className="mb-4"
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            Saved States
          </h2>

          {savedStates.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>
              No saved states yet. Make some annotations and click the disk
              icon in the toolbar to create your first saved state.
            </p>
          ) : (
            <ul
              className="space-y-1 w-full list-none m-0"
              style={{ paddingLeft: 0 }}
            >
              {savedStates.map((state, index) => {
                const isSelected = selectedState === state.key;
                return (
                  <li key={state.key}>
                    <div
                      className="flex items-center gap-2 px-3 py-2 transition-all"
                      style={{
                        background: isSelected
                          ? "var(--data-green)"
                          : "var(--bg-elev)",
                        color: isSelected ? "#fff" : "var(--ink)",
                        border: `1px solid ${
                          isSelected ? "var(--data-green)" : "var(--line)"
                        }`,
                        borderRadius: "var(--r-2)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleStateClick(state.key)}
                        className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                        style={{ color: "inherit" }}
                      >
                        {/* Version number */}
                        <div
                          className="shrink-0 w-6 h-6 flex items-center justify-center text-xs font-bold"
                          style={{
                            background: isSelected
                              ? "#fff"
                              : "var(--surface)",
                            color: isSelected
                              ? "var(--data-green)"
                              : "var(--ink-3)",
                            borderRadius: "var(--r-pill)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          {savedStates.length - index}
                        </div>

                        {/* State info */}
                        <div className="flex-1 min-w-0 text-left">
                          <div
                            className="font-medium text-sm"
                            style={{
                              color: isSelected ? "#fff" : "var(--ink)",
                            }}
                          >
                            {getRelativeTime(state.timestamp)}
                          </div>
                          <div
                            className="text-xs"
                            style={{
                              color: isSelected
                                ? "rgba(255,255,255,0.8)"
                                : "var(--ink-3)",
                            }}
                          >
                            {formatTime(state.timestamp)}
                          </div>
                        </div>
                      </button>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => handleDeleteState(state.key, e)}
                        className="shrink-0 p-1 transition-colors cursor-pointer"
                        style={{
                          color: isSelected ? "#fff" : "var(--ink-3)",
                          borderRadius: "var(--r-1)",
                        }}
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
                );
              })}
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
