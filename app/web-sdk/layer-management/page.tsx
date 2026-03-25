"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useMemo } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import type { LayerInfo } from "./viewer";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

const LAYER_COLORS: Record<string, string> = {
  Structure: "bg-gray-500",
  Furniture: "bg-amber-600",
  Plumbing: "bg-blue-500",
  Electrical: "bg-orange-500",
  HVAC: "bg-green-500",
  Dimensions: "bg-gray-400",
};

const LAYER_ICONS: Record<string, string> = {
  Structure: "wall",
  Furniture: "sofa",
  Plumbing: "droplet",
  Electrical: "zap",
  HVAC: "wind",
  Dimensions: "ruler",
};

interface Preset {
  name: string;
  description: string;
  layerNames: string[];
}

const PRESETS: Preset[] = [
  {
    name: "All Systems",
    description: "Show everything",
    layerNames: ["Structure", "Furniture", "Plumbing", "Electrical", "HVAC", "Dimensions"],
  },
  {
    name: "Structure Only",
    description: "Walls and rooms",
    layerNames: ["Structure"],
  },
  {
    name: "Plumbing",
    description: "Pipes and fixtures",
    layerNames: ["Structure", "Plumbing"],
  },
  {
    name: "Electrical",
    description: "Wiring, outlets, lights",
    layerNames: ["Structure", "Electrical"],
  },
  {
    name: "HVAC",
    description: "Ducts, vents, A/C",
    layerNames: ["Structure", "HVAC"],
  },
  {
    name: "Furnished",
    description: "Rooms with furniture",
    layerNames: ["Structure", "Furniture", "Dimensions"],
  },
];

export default function LayerManagementPage() {
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [visibleLayerIds, setVisibleLayerIds] = useState<number[] | null>(null);
  const [activePreset, setActivePreset] = useState<string | null>("All Systems");

  const handleLayers = useCallback((discovered: LayerInfo[]) => {
    setLayers(discovered);
    setVisibleLayerIds(discovered.map((l) => l.id));
  }, []);

  const toggleLayer = useCallback(
    (id: number) => {
      setActivePreset(null);
      setVisibleLayerIds((prev) => {
        if (!prev) return prev;
        return prev.includes(id)
          ? prev.filter((lid) => lid !== id)
          : [...prev, id];
      });
    },
    [],
  );

  const applyPreset = useCallback(
    (preset: Preset) => {
      const ids = layers
        .filter((l) => preset.layerNames.includes(l.name))
        .map((l) => l.id);
      setVisibleLayerIds(ids);
      setActivePreset(preset.name);
    },
    [layers],
  );

  const visibleCount = visibleLayerIds?.length ?? 0;
  const totalCount = layers.length;

  const layersWithVisibility = useMemo(
    () =>
      layers.map((l) => ({
        ...l,
        visible: visibleLayerIds?.includes(l.id) ?? true,
      })),
    [layers, visibleLayerIds],
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Layer Management"
        description="Toggle PDF layer groups (OCGs) to show or hide building systems on a construction floor plan. Use presets to quickly isolate specific systems."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              {/* Header */}
              <div className="p-4 border-b border-[var(--warm-gray-400)]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Layers
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {visibleCount} of {totalCount} visible
                  </span>
                </div>
              </div>

              {/* Layer toggles */}
              <div className="flex-1 overflow-y-auto">
                {layers.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-500 text-center">
                    Loading layers...
                  </div>
                ) : (
                  <div className="p-3 space-y-1">
                    {layersWithVisibility.map((layer) => (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => toggleLayer(layer.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                          layer.visible
                            ? "bg-gray-50 dark:bg-[#1a1414]"
                            : "opacity-50 hover:opacity-75"
                        } hover:bg-gray-100 dark:hover:bg-[#1a1414]`}
                      >
                        {/* Color indicator */}
                        <span
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            LAYER_COLORS[layer.name] ?? "bg-gray-400"
                          } ${!layer.visible ? "opacity-30" : ""}`}
                        />

                        {/* Icon + name */}
                        <span className="flex items-center gap-2 flex-1 min-w-0">
                          <LayerIcon
                            icon={LAYER_ICONS[layer.name] ?? "layer"}
                            visible={layer.visible}
                          />
                          <span
                            className={`truncate ${
                              layer.visible
                                ? "text-gray-900 dark:text-white font-medium"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {layer.name}
                          </span>
                        </span>

                        {/* Toggle indicator */}
                        <span
                          className={`w-8 h-5 rounded-full flex items-center transition-colors flex-shrink-0 ${
                            layer.visible
                              ? "bg-blue-500 justify-end"
                              : "bg-gray-300 dark:bg-gray-600 justify-start"
                          }`}
                        >
                          <span className="w-3.5 h-3.5 bg-white rounded-full mx-0.5 shadow-sm" />
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Presets */}
                {layers.length > 0 && (
                  <div className="px-3 pb-3">
                    <div className="border-t border-[var(--warm-gray-400)] pt-3 mt-1">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-2">
                        Presets
                      </h4>
                      <div className="space-y-1">
                        {PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => applyPreset(preset)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                              activePreset === preset.name
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1a1414]"
                            }`}
                          >
                            <div className="font-medium">{preset.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {preset.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Viewer */}
            <div className="flex-1 min-w-0">
              <Viewer
                visibleLayerIds={visibleLayerIds}
                onLayers={handleLayers}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function LayerIcon({ icon, visible }: { icon: string; visible: boolean }) {
  const cls = `w-4 h-4 flex-shrink-0 ${
    visible
      ? "text-gray-600 dark:text-gray-300"
      : "text-gray-300 dark:text-gray-600"
  }`;

  switch (icon) {
    case "wall":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="12" height="12" rx="1" />
          <line x1="8" y1="2" x2="8" y2="14" />
          <line x1="2" y1="8" x2="14" y2="8" />
        </svg>
      );
    case "sofa":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="6" width="12" height="5" rx="1" />
          <path d="M4 6V5a2 2 0 012-2h4a2 2 0 012 2v1" />
          <line x1="3" y1="11" x2="3" y2="13" />
          <line x1="13" y1="11" x2="13" y2="13" />
        </svg>
      );
    case "droplet":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 2L4.5 8a3.5 3.5 0 107 0L8 2z" />
        </svg>
      );
    case "zap":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <polyline points="9 2 5 9 8 9 7 14 11 7 8 7 9 2" />
        </svg>
      );
    case "wind":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 6h8a2 2 0 100-4" />
          <path d="M2 10h10a2 2 0 110 4" />
          <path d="M2 8h6" />
        </svg>
      );
    case "ruler":
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="1" y="6" width="14" height="4" rx="0.5" />
          <line x1="4" y1="6" x2="4" y2="8" />
          <line x1="7" y1="6" x2="7" y2="9" />
          <line x1="10" y1="6" x2="10" y2="8" />
          <line x1="13" y1="6" x2="13" y2="8" />
        </svg>
      );
    default:
      return (
        <svg className={cls} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="2" y="2" width="12" height="12" rx="2" />
        </svg>
      );
  }
}
