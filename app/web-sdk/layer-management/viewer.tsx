"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef } from "react";

const DOCUMENT = "/documents/floor-plan-layers.pdf";

export interface LayerInfo {
  id: number;
  name: string;
  visible: boolean;
}

interface LayerManagementViewerProps {
  visibleLayerIds: number[] | null;
  onLayers: (layers: LayerInfo[]) => void;
}

export default function LayerManagementViewer({
  visibleLayerIds,
  onLayers,
}: LayerManagementViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const onLayersRef = useRef(onLayers);
  onLayersRef.current = onLayers;

  const discoverLayers = useCallback(async (inst: Instance) => {
    try {
      const state = await inst.getLayersVisibilityState();
      // The SDK returns visibleLayerIds. On first load all layers are visible,
      // so this gives us the full set of layer IDs.
      const allIds = state.visibleLayerIds;

      // Map IDs to known layer names from our floor plan document.
      // The OCGs are created in order: Structure(0), Furniture(1), Plumbing(2),
      // Electrical(3), HVAC(4), Dimensions(5). IDs are assigned by the PDF.
      const knownNames: Record<number, string> = {};
      const nameOrder = [
        "Structure",
        "Furniture",
        "Plumbing",
        "Electrical",
        "HVAC",
        "Dimensions",
      ];
      const sorted = [...allIds].sort((a, b) => a - b);
      sorted.forEach((id, i) => {
        knownNames[id] = nameOrder[i] ?? `Layer ${id}`;
      });

      const layers: LayerInfo[] = sorted.map((id) => ({
        id,
        name: knownNames[id],
        visible: true,
      }));

      onLayersRef.current(layers);
    } catch {
      onLayersRef.current([]);
    }
  }, []);

  // Apply visibility changes from parent
  useEffect(() => {
    const inst = instanceRef.current;
    if (!inst || visibleLayerIds === null) return;

    inst.setLayersVisibilityState({ visibleLayerIds });
  }, [visibleLayerIds]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      toolbarItems: (NutrientViewer.defaultToolbarItems ?? []).filter(
        (item: { type: string }) =>
          ["pager", "zoom-out", "zoom-in", "zoom-mode"].includes(item.type),
      ),
    }).then(async (instance: Instance) => {
      instanceRef.current = instance;
      await discoverLayers(instance);
    });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, [discoverLayers]);

  return <div ref={containerRef} style={{ height: "100%" }} />;
}
