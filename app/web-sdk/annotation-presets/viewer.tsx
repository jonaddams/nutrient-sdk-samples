"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef } from "react";

const DOCUMENT = "/documents/jacques-torres-chocolate-chip-cookies.pdf";

export interface PresetConfig {
  key: string;
  label: string;
  properties: Record<string, unknown>;
}

interface AnnotationPresetsViewerProps {
  presets: PresetConfig[];
}

export default function AnnotationPresetsViewer({
  presets,
}: AnnotationPresetsViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const presetsRef = useRef(presets);
  presetsRef.current = presets;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    // Build initial presets from config
    const annotationPresets: Record<string, Record<string, unknown>> = {
      ...NutrientViewer.defaultAnnotationPresets,
    };

    for (const preset of presetsRef.current) {
      const resolved = resolvePresetProperties(NutrientViewer, preset);
      annotationPresets[preset.key] = {
        ...annotationPresets[preset.key],
        ...resolved,
      };
    }

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      theme: NutrientViewer.Theme.DARK,
      annotationPresets,
    }).then((instance: Instance) => {
      instanceRef.current = instance;
    });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, []);

  // Apply preset changes after load
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    inst.setAnnotationPresets((current: Record<string, any>) => {
      const updated = { ...current };
      for (const preset of presets) {
        const resolved = resolvePresetProperties(NutrientViewer, preset);
        updated[preset.key] = {
          ...updated[preset.key],
          ...resolved,
        };
      }
      return updated;
    });
  }, [presets]);

  return <div ref={containerRef} style={{ height: "100%" }} />;
}

/**
 * Convert serializable preset properties into SDK objects
 * (e.g. color objects into NutrientViewer.Color instances).
 */
function resolvePresetProperties(
  NutrientViewer: any,
  preset: PresetConfig,
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(preset.properties)) {
    if (
      value &&
      typeof value === "object" &&
      "r" in value &&
      "g" in value &&
      "b" in value
    ) {
      resolved[key] = new NutrientViewer.Color(value);
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}
