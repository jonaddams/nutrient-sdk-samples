"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import type { WatermarkConfig } from "./viewer";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

function rgbToHex(color: { r: number; g: number; b: number }): string {
  const r = color.r.toString(16).padStart(2, "0");
  const g = color.g.toString(16).padStart(2, "0");
  const b = color.b.toString(16).padStart(2, "0");
  return "#" + r + g + b;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? {
        r: parseInt(m[1], 16),
        g: parseInt(m[2], 16),
        b: parseInt(m[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

const DEFAULT_CONFIG: WatermarkConfig = {
  text: "CONFIDENTIAL",
  fontSize: 48,
  color: { r: 200, g: 0, b: 0 },
  opacity: 0.25,
  rotation: -45,
};

const PRESET_TEXTS = [
  "CONFIDENTIAL",
  "DRAFT",
  "SAMPLE",
  "DO NOT COPY",
  "APPROVED",
  "INTERNAL USE ONLY",
];

export default function WatermarkPage() {
  const [config, setConfig] = useState<WatermarkConfig>(DEFAULT_CONFIG);

  // Debounce config to avoid reloading the viewer on every slider tick
  const [debouncedConfig, setDebouncedConfig] = useState(config);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedConfig(config), 300);
    return () => clearTimeout(timer);
  }, [config]);

  const update = <K extends keyof WatermarkConfig>(
    key: K,
    value: WatermarkConfig[K],
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Watermark"
        description="Add configurable text watermarks to every page of a document. Customize text, font size, color, opacity, and rotation angle."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--warm-gray-400)]">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Watermark Settings
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Text input */}
                <div>
                  <label
                    htmlFor="wm-text"
                    className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                  >
                    Text
                  </label>
                  <input
                    id="wm-text"
                    type="text"
                    value={config.text}
                    onChange={(e) => update("text", e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--warm-gray-400)] rounded-md bg-white dark:bg-[#1a1414] text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)]"
                  />
                </div>

                {/* Preset texts */}
                <div>
                  <span className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Quick Presets
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_TEXTS.map((text) => (
                      <button
                        key={text}
                        type="button"
                        onClick={() => update("text", text)}
                        className={
                          "px-2 py-1 text-xs rounded-md border transition-colors cursor-pointer " +
                          (config.text === text
                            ? "border-[var(--digital-pollen)] bg-[var(--digital-pollen)] text-[var(--black)] font-medium"
                            : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400")
                        }
                      >
                        {text}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font size */}
                <div>
                  <label
                    htmlFor="wm-fontsize"
                    className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                  >
                    Font Size
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="wm-fontsize"
                      type="range"
                      min={16}
                      max={120}
                      step={2}
                      value={config.fontSize}
                      onChange={(e) =>
                        update("fontSize", Number(e.target.value))
                      }
                      className="flex-1"
                      style={{ accentColor: "var(--digital-pollen)" }}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums w-8 text-right">
                      {config.fontSize}
                    </span>
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label
                    htmlFor="wm-color"
                    className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                  >
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="wm-color"
                      type="color"
                      value={rgbToHex(config.color)}
                      onChange={(e) =>
                        update("color", hexToRgb(e.target.value))
                      }
                      className="w-8 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {rgbToHex(config.color)}
                    </span>
                  </div>
                </div>

                {/* Opacity */}
                <div>
                  <label
                    htmlFor="wm-opacity"
                    className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                  >
                    Opacity
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="wm-opacity"
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={config.opacity}
                      onChange={(e) =>
                        update("opacity", Number(e.target.value))
                      }
                      className="flex-1"
                      style={{ accentColor: "var(--digital-pollen)" }}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums w-10 text-right">
                      {Math.round(config.opacity * 100)}%
                    </span>
                  </div>
                </div>

                {/* Rotation */}
                <div>
                  <label
                    htmlFor="wm-rotation"
                    className="block text-xs text-gray-600 dark:text-gray-400 mb-1"
                  >
                    Rotation
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="wm-rotation"
                      type="range"
                      min={-90}
                      max={90}
                      step={5}
                      value={config.rotation}
                      onChange={(e) =>
                        update("rotation", Number(e.target.value))
                      }
                      className="flex-1"
                      style={{ accentColor: "var(--digital-pollen)" }}
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums w-10 text-right">
                      {config.rotation}&deg;
                    </span>
                  </div>
                </div>

                {/* Reset */}
                <button
                  type="button"
                  onClick={() => setConfig(DEFAULT_CONFIG)}
                  className="text-xs font-semibold px-3 py-1 rounded-md transition-colors cursor-pointer"
                  style={{
                    color: "var(--digital-pollen)",
                    border: "1px solid var(--digital-pollen)",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--digital-pollen)";
                    e.currentTarget.style.color = "var(--black)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--digital-pollen)";
                  }}
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Viewer */}
            <div className="flex-1 min-w-0">
              <Viewer config={debouncedConfig} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
