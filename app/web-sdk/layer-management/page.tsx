"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";
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
    layerNames: [
      "Structure",
      "Furniture",
      "Plumbing",
      "Electrical",
      "HVAC",
      "Dimensions",
    ],
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
  const [activePreset, setActivePreset] = useState<string | null>(
    "All Systems",
  );

  const handleLayers = useCallback((discovered: LayerInfo[]) => {
    setLayers(discovered);
    setVisibleLayerIds(discovered.map((l) => l.id));
  }, []);

  const toggleLayer = useCallback((id: number) => {
    setActivePreset(null);
    setVisibleLayerIds((prev) => {
      if (!prev) return prev;
      return prev.includes(id)
        ? prev.filter((lid) => lid !== id)
        : [...prev, id];
    });
  }, []);

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

  const sidebar = (
    <>
      {/* Header */}
      <div
        className="p-4"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <div className="flex items-center justify-between">
          <h3
            className="text-sm font-semibold"
            style={{ color: "var(--ink)" }}
          >
            Layers
          </h3>
          <span className="text-xs" style={{ color: "var(--ink-3)" }}>
            {visibleCount} of {totalCount} visible
          </span>
        </div>
      </div>

      {/* Layer toggles */}
      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <div
            className="p-4 text-sm text-center"
            style={{ color: "var(--ink-4)" }}
          >
            Loading layers...
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {layersWithVisibility.map((layer) => (
              <button
                key={layer.id}
                type="button"
                onClick={() => toggleLayer(layer.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors cursor-pointer"
                style={{
                  background: layer.visible
                    ? "var(--bg-elev)"
                    : "transparent",
                  opacity: layer.visible ? 1 : 0.55,
                  borderRadius: "var(--r-2)",
                  border: "1px solid var(--line)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--accent-tint)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = layer.visible
                    ? "var(--bg-elev)"
                    : "transparent";
                }}
              >
                {/* Color indicator */}
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${
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
                    className="truncate"
                    style={{
                      color: layer.visible ? "var(--ink)" : "var(--ink-4)",
                      fontWeight: layer.visible ? 500 : 400,
                    }}
                  >
                    {layer.name}
                  </span>
                </span>

                {/* Toggle indicator */}
                <span
                  className="w-8 h-5 flex items-center transition-colors shrink-0"
                  style={{
                    background: layer.visible
                      ? "var(--accent)"
                      : "var(--line-strong)",
                    justifyContent: layer.visible ? "flex-end" : "flex-start",
                    borderRadius: "var(--r-pill)",
                  }}
                >
                  <span
                    className="w-3.5 h-3.5 mx-0.5"
                    style={{
                      background: "#fff",
                      borderRadius: "var(--r-pill)",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
                    }}
                  />
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Presets */}
        {layers.length > 0 && (
          <div className="px-3 pb-3">
            <div
              className="pt-3 mt-1"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <h4
                className="text-xs font-semibold uppercase tracking-wider px-3 mb-2"
                style={{ color: "var(--ink-3)" }}
              >
                Presets
              </h4>
              <div className="space-y-1">
                {PRESETS.map((preset) => {
                  const isActive = activePreset === preset.name;
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="w-full text-left px-3 py-2 text-sm transition-colors cursor-pointer"
                      style={{
                        background: isActive
                          ? "var(--accent-tint)"
                          : "transparent",
                        color: isActive ? "var(--accent)" : "var(--ink-2)",
                        borderRadius: "var(--r-2)",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background =
                            "var(--accent-tint)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = "transparent";
                        }
                      }}
                    >
                      <div className="font-medium">{preset.name}</div>
                      <div
                        className="text-xs mt-0.5"
                        style={{
                          color: isActive
                            ? "var(--accent)"
                            : "var(--ink-3)",
                          opacity: isActive ? 0.8 : 1,
                        }}
                      >
                        {preset.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <SampleFrame
      title="Layer Management"
      description="Toggle PDF layer groups (OCGs) to show or hide building systems on a construction floor plan. Use presets to quickly isolate specific systems."
      sidebar={sidebar}
      sidebarSide="left"
    >
      <Viewer
        visibleLayerIds={visibleLayerIds}
        onLayers={handleLayers}
      />
    </SampleFrame>
  );
}

function LayerIcon({ icon, visible }: { icon: string; visible: boolean }) {
  const cls = "w-4 h-4 shrink-0";
  return (
    <span
      className="inline-flex shrink-0"
      style={{ color: visible ? "var(--ink-2)" : "var(--ink-4)" }}
    >
      {renderLayerIcon(icon, cls)}
    </span>
  );
}

function renderLayerIcon(icon: string, cls: string) {

  switch (icon) {
    case "wall":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="2" y="2" width="12" height="12" rx="1" />
          <line x1="8" y1="2" x2="8" y2="14" />
          <line x1="2" y1="8" x2="14" y2="8" />
        </svg>
      );
    case "sofa":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="2" y="6" width="12" height="5" rx="1" />
          <path d="M4 6V5a2 2 0 012-2h4a2 2 0 012 2v1" />
          <line x1="3" y1="11" x2="3" y2="13" />
          <line x1="13" y1="11" x2="13" y2="13" />
        </svg>
      );
    case "droplet":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M8 2L4.5 8a3.5 3.5 0 107 0L8 2z" />
        </svg>
      );
    case "zap":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <polyline points="9 2 5 9 8 9 7 14 11 7 8 7 9 2" />
        </svg>
      );
    case "wind":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2 6h8a2 2 0 100-4" />
          <path d="M2 10h10a2 2 0 110 4" />
          <path d="M2 8h6" />
        </svg>
      );
    case "ruler":
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="1" y="6" width="14" height="4" rx="0.5" />
          <line x1="4" y1="6" x2="4" y2="8" />
          <line x1="7" y1="6" x2="7" y2="9" />
          <line x1="10" y1="6" x2="10" y2="8" />
          <line x1="13" y1="6" x2="13" y2="8" />
        </svg>
      );
    default:
      return (
        <svg
          className={cls}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="2" y="2" width="12" height="12" rx="2" />
        </svg>
      );
  }
}
