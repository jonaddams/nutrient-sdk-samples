"use client";

import type { Instance, ToolbarItem } from "@nutrient-sdk/viewer";
import { useEffect, useRef } from "react";

const DOCUMENT = "/documents/jacques-torres-chocolate-chip-cookies-recipe.pdf";

const DARK_MODE_STYLE_ID = "night-mode-style";
const DARK_MODE_CSS = `
  .PSPDFKit-Spread { filter: invert(1) hue-rotate(-180deg); }
  .PSPDFKit-Viewport { background-color: #1a1a1a; }
`;

const MOON_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SUN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

export default function NightModeViewer() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    const state = { isDark: false, instance: null as Instance | null };

    const nightModeButton = {
      type: "custom" as const,
      id: "night-mode-toggle",
      title: "Night Mode",
      icon: MOON_ICON,
      onPress: () => {
        state.isDark = !state.isDark;

        // Inject or remove style inside the viewer's shadow root
        const root =
          container.querySelector(".PSPDFKit-Container")?.shadowRoot ??
          container;
        const existing = root.querySelector(
          `#${DARK_MODE_STYLE_ID}`,
        ) as HTMLStyleElement | null;

        if (state.isDark && !existing) {
          const style = document.createElement("style");
          style.id = DARK_MODE_STYLE_ID;
          style.textContent = DARK_MODE_CSS;
          root.appendChild(style);
        } else if (!state.isDark && existing) {
          existing.remove();
        }

        // Update toolbar icon to reflect current state
        state.instance?.setToolbarItems((items: ToolbarItem[]) =>
          items.map((item) =>
            item.id === "night-mode-toggle"
              ? { ...item, icon: state.isDark ? SUN_ICON : MOON_ICON }
              : item,
          ),
        );
      },
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
        { type: "spacer" },
        nightModeButton,
      ],
    }).then((instance: Instance) => {
      state.instance = instance;
    });

    return () => {
      NutrientViewer.unload(container);
    };
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
