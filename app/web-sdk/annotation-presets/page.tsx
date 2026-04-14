"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import type { PresetConfig } from "./viewer";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

interface PresetField {
  key: string;
  label: string;
  type: "color" | "number" | "select" | "dashArray";
  options?: { label: string; value: unknown }[];
  min?: number;
  max?: number;
  step?: number;
}

interface PresetDefinition {
  key: string;
  label: string;
  fields: PresetField[];
  defaults: Record<string, unknown>;
}

const PRESET_DEFINITIONS: PresetDefinition[] = [
  {
    key: "ink",
    label: "Ink / Freehand",
    fields: [
      {
        key: "lineWidth",
        label: "Line Width",
        type: "number",
        min: 1,
        max: 30,
        step: 1,
      },
      { key: "strokeColor", label: "Stroke Color", type: "color" },
      {
        key: "opacity",
        label: "Opacity",
        type: "number",
        min: 0.1,
        max: 1,
        step: 0.1,
      },
    ],
    defaults: {
      lineWidth: 5,
      strokeColor: { r: 0, g: 100, b: 200 },
      opacity: 1,
    },
  },
  {
    key: "text",
    label: "Free Text",
    fields: [
      {
        key: "font",
        label: "Font",
        type: "select",
        options: [
          { label: "Helvetica", value: "Helvetica" },
          { label: "Georgia", value: "Georgia" },
          { label: "Courier", value: "Courier" },
          { label: "Times New Roman", value: "Times-Roman" },
        ],
      },
      {
        key: "fontSize",
        label: "Font Size",
        type: "number",
        min: 8,
        max: 72,
        step: 1,
      },
      { key: "fontColor", label: "Font Color", type: "color" },
      { key: "fillColor", label: "Background", type: "color" },
    ],
    defaults: {
      font: "Helvetica",
      fontSize: 18,
      fontColor: { r: 0, g: 0, b: 0 },
      fillColor: { r: 255, g: 255, b: 200 },
    },
  },
  {
    key: "line",
    label: "Line",
    fields: [
      {
        key: "strokeWidth",
        label: "Stroke Width",
        type: "number",
        min: 1,
        max: 20,
        step: 1,
      },
      { key: "strokeColor", label: "Stroke Color", type: "color" },
      {
        key: "strokeDashArray",
        label: "Line Style",
        type: "dashArray",
        options: [
          { label: "Solid", value: null },
          { label: "Dashed", value: [3, 3] },
          { label: "Dotted", value: [1, 3] },
          { label: "Dash-Dot", value: [6, 3, 1, 3] },
        ],
      },
    ],
    defaults: {
      strokeWidth: 3,
      strokeColor: { r: 220, g: 50, b: 50 },
      strokeDashArray: null,
    },
  },
  {
    key: "arrow",
    label: "Arrow",
    fields: [
      {
        key: "strokeWidth",
        label: "Stroke Width",
        type: "number",
        min: 1,
        max: 20,
        step: 1,
      },
      { key: "strokeColor", label: "Stroke Color", type: "color" },
    ],
    defaults: { strokeWidth: 3, strokeColor: { r: 220, g: 50, b: 50 } },
  },
  {
    key: "rectangle",
    label: "Rectangle",
    fields: [
      {
        key: "strokeWidth",
        label: "Border Width",
        type: "number",
        min: 0,
        max: 20,
        step: 1,
      },
      { key: "strokeColor", label: "Border Color", type: "color" },
      { key: "fillColor", label: "Fill Color", type: "color" },
      {
        key: "opacity",
        label: "Opacity",
        type: "number",
        min: 0.1,
        max: 1,
        step: 0.1,
      },
    ],
    defaults: {
      strokeWidth: 2,
      strokeColor: { r: 0, g: 0, b: 0 },
      fillColor: { r: 100, g: 180, b: 255 },
      opacity: 0.5,
    },
  },
  {
    key: "ellipse",
    label: "Ellipse",
    fields: [
      {
        key: "strokeWidth",
        label: "Border Width",
        type: "number",
        min: 0,
        max: 20,
        step: 1,
      },
      { key: "strokeColor", label: "Border Color", type: "color" },
      { key: "fillColor", label: "Fill Color", type: "color" },
      {
        key: "opacity",
        label: "Opacity",
        type: "number",
        min: 0.1,
        max: 1,
        step: 0.1,
      },
    ],
    defaults: {
      strokeWidth: 2,
      strokeColor: { r: 0, g: 0, b: 0 },
      fillColor: { r: 180, g: 100, b: 255 },
      opacity: 0.5,
    },
  },
  {
    key: "note",
    label: "Note / Sticky",
    fields: [{ key: "color", label: "Color", type: "color" }],
    defaults: { color: { r: 255, g: 220, b: 50 } },
  },
  {
    key: "text-highlighter",
    label: "Text Highlighter",
    fields: [
      { key: "color", label: "Color", type: "color" },
      {
        key: "opacity",
        label: "Opacity",
        type: "number",
        min: 0.1,
        max: 1,
        step: 0.1,
      },
    ],
    defaults: { color: { r: 255, g: 215, b: 0 }, opacity: 0.5 },
  },
];

function rgbToHex(color: { r: number; g: number; b: number }): string {
  const r = color.r.toString(16).padStart(2, "0");
  const g = color.g.toString(16).padStart(2, "0");
  const b = color.b.toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

export default function AnnotationPresetsPage() {
  const [presetValues, setPresetValues] = useState<
    Record<string, Record<string, unknown>>
  >(() => {
    const initial: Record<string, Record<string, unknown>> = {};
    for (const def of PRESET_DEFINITIONS) {
      initial[def.key] = { ...def.defaults };
    }
    return initial;
  });

  const [expandedPreset, setExpandedPreset] = useState<string | null>("ink");

  const updateProperty = useCallback(
    (presetKey: string, propKey: string, value: unknown) => {
      setPresetValues((prev) => ({
        ...prev,
        [presetKey]: { ...prev[presetKey], [propKey]: value },
      }));
    },
    [],
  );

  const resetPreset = useCallback((def: PresetDefinition) => {
    setPresetValues((prev) => ({
      ...prev,
      [def.key]: { ...def.defaults },
    }));
  }, []);

  // Convert state to PresetConfig array for the viewer
  const presetConfigs: PresetConfig[] = PRESET_DEFINITIONS.map((def) => ({
    key: def.key,
    label: def.label,
    properties: presetValues[def.key] ?? def.defaults,
  }));

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Annotation Presets"
        description="Customize default properties for annotation tools. Changes apply instantly when you draw new annotations. Configure colors, sizes, fonts, line styles, and more."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0 overflow-y-auto">
              <div className="p-4 border-b border-[var(--warm-gray-400)]">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Annotation Presets
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Configure defaults for each annotation tool
                </p>
              </div>

              {PRESET_DEFINITIONS.map((def) => (
                <div
                  key={def.key}
                  className="border-b border-gray-200 dark:border-gray-700"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedPreset((prev) =>
                        prev === def.key ? null : def.key,
                      )
                    }
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#1a1414] transition-colors cursor-pointer"
                  >
                    <span>{def.label}</span>
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform:
                          expandedPreset === def.key
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        transition: "transform 0.2s",
                      }}
                    >
                      <title>Toggle</title>
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {expandedPreset === def.key && (
                    <div className="px-4 pb-4 space-y-3">
                      {def.fields.map((field) => (
                        <FieldControl
                          key={field.key}
                          field={field}
                          value={presetValues[def.key]?.[field.key]}
                          onChange={(val) =>
                            updateProperty(def.key, field.key, val)
                          }
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => resetPreset(def)}
                        className="text-xs font-semibold px-3 py-1 rounded-md transition-colors cursor-pointer"
                        style={{
                          color: "var(--digital-pollen)",
                          border: "1px solid var(--digital-pollen)",
                          background: "transparent",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "var(--digital-pollen)";
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
                  )}
                </div>
              ))}
            </div>

            {/* Viewer */}
            <div className="flex-1 min-w-0">
              <Viewer presets={presetConfigs} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: PresetField;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  if (field.type === "color") {
    const colorVal = value as { r: number; g: number; b: number } | undefined;
    const hex = colorVal ? rgbToHex(colorVal) : "#000000";
    return (
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          {field.label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={hex}
            onChange={(e) => onChange(hexToRgb(e.target.value))}
            className="w-8 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {hex}
          </span>
        </div>
      </div>
    );
  }

  if (field.type === "number") {
    const numVal = (value as number) ?? 0;
    return (
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          {field.label}
        </label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={numVal}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1"
            style={{ accentColor: "var(--digital-pollen)" }}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono tabular-nums w-8 text-right">
            {field.step && field.step < 1 ? numVal.toFixed(1) : numVal}
          </span>
        </div>
      </div>
    );
  }

  if (field.type === "select" || field.type === "dashArray") {
    const options = field.options ?? [];
    const currentIdx = options.findIndex(
      (opt) => JSON.stringify(opt.value) === JSON.stringify(value),
    );
    return (
      <div>
        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
          {field.label}
        </label>
        <select
          value={currentIdx >= 0 ? currentIdx : 0}
          onChange={(e) => {
            const idx = Number(e.target.value);
            onChange(options[idx]?.value);
          }}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#1a1414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)]"
        >
          {options.map((opt, i) => (
            <option key={opt.label} value={i}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return null;
}
