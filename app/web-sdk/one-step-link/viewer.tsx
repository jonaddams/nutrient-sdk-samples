"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import "./styles.css";

const DOCUMENT = "/documents/contract-template.pdf";

const LINK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';

export default function OneStepLinkViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    const addLinkButton = {
      type: "custom" as const,
      id: "add-link",
      title: "Add Link",
      icon: LINK_ICON,
      onPress: () => setIsModalOpen(true),
    };

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      toolbarItems: [
        ...(NutrientViewer.defaultToolbarItems ?? []).filter(
          (item: { type: string }) =>
            ["pager", "zoom-out", "zoom-in", "zoom-mode", "search"].includes(
              item.type,
            ),
        ),
        addLinkButton,
      ],
    }).then((instance: Instance) => {
      instanceRef.current = instance;
    });

    return () => {
      NutrientViewer.unload(container);
      instanceRef.current = null;
    };
  }, []);

  return (
    <div className="osl-wrapper">
      <div className="osl-viewer-shell">
        <div
          ref={containerRef}
          className="osl-viewer"
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      {isModalOpen && (
        <div className="osl-modal-overlay">
          <div className="osl-modal">Modal — filled in Task 3</div>
        </div>
      )}
    </div>
  );
}
