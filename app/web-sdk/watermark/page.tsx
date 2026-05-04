"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";
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

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-xs)",
  color: "var(--ink-3)",
  marginBottom: 4,
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  color: "var(--ink)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-2)",
  fontSize: "var(--text-sm)",
};

const valueText: React.CSSProperties = {
  color: "var(--ink-3)",
  fontFamily: "var(--font-mono)",
};

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

  const sidebar = (
    <>
      <div className="p-4" style={{ borderBottom: "1px solid var(--line)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Watermark Settings
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label htmlFor="wm-text" style={fieldLabel}>
            Text
          </label>
          <input
            id="wm-text"
            type="text"
            value={config.text}
            onChange={(e) => update("text", e.target.value)}
            className="w-full px-3 py-2 focus:outline-none"
            style={inputStyle}
          />
        </div>

        <div>
          <span style={fieldLabel}>Quick Presets</span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TEXTS.map((text) => {
              const active = config.text === text;
              return (
                <button
                  key={text}
                  type="button"
                  onClick={() => update("text", text)}
                  className="px-2 py-1 text-xs transition-colors cursor-pointer"
                  style={{
                    border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
                    background: active ? "var(--ink)" : "transparent",
                    color: active ? "var(--bg)" : "var(--ink-3)",
                    borderRadius: "var(--r-1)",
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="wm-fontsize" style={fieldLabel}>
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
              onChange={(e) => update("fontSize", Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: "var(--accent)" }}
            />
            <span
              className="text-xs tabular-nums w-8 text-right"
              style={valueText}
            >
              {config.fontSize}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="wm-color" style={fieldLabel}>
            Color
          </label>
          <div className="flex items-center gap-2">
            <input
              id="wm-color"
              type="color"
              value={rgbToHex(config.color)}
              onChange={(e) => update("color", hexToRgb(e.target.value))}
              className="w-8 h-8 cursor-pointer"
              style={{
                borderRadius: "var(--r-1)",
                border: "1px solid var(--line)",
              }}
            />
            <span className="text-xs" style={valueText}>
              {rgbToHex(config.color)}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="wm-opacity" style={fieldLabel}>
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
              onChange={(e) => update("opacity", Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: "var(--accent)" }}
            />
            <span
              className="text-xs tabular-nums w-10 text-right"
              style={valueText}
            >
              {Math.round(config.opacity * 100)}%
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="wm-rotation" style={fieldLabel}>
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
              onChange={(e) => update("rotation", Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: "var(--accent)" }}
            />
            <span
              className="text-xs tabular-nums w-10 text-right"
              style={valueText}
            >
              {config.rotation}&deg;
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfig(DEFAULT_CONFIG)}
          className="btn ghost btn-sm"
        >
          Reset Defaults
        </button>
      </div>
    </>
  );

  return (
    <SampleFrame
      title="Watermark"
      description="Add configurable text watermarks to every page of a document. Customize text, font size, color, opacity, and rotation angle."
      sidebar={sidebar}
      sidebarSide="left"
      wide
    >
      <Viewer config={debouncedConfig} />
    </SampleFrame>
  );
}
