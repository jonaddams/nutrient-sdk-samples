"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef, useState } from "react";

const DOCUMENT = "/documents/jacques-torres-chocolate-chip-cookies-recipe.pdf";
const FILTER_STYLE_ID = "brightness-contrast-style";

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Moon</title>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>Sun</title>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function getFilterCSS(intensity: number): string {
  // intensity: -100 (full brighten) to 0 (normal) to 100 (full night)
  const absIntensity = Math.abs(intensity);
  const t = absIntensity / 100;

  if (intensity > 0) {
    // Night mode: invert colors + darken background
    const bgBrightness = Math.round(255 - (255 - 26) * t);
    const bg = `rgb(${bgBrightness}, ${bgBrightness}, ${bgBrightness})`;
    return `
      .PSPDFKit-Spread { filter: invert(${t}) hue-rotate(${t > 0 ? -180 : 0}deg); }
      .PSPDFKit-Viewport { background-color: ${bg}; }
    `;
  }

  // Brighten mode: boost brightness + contrast for dark/faded scans
  // brightness: 1.0 → 2.0, contrast: 1.0 → 1.5
  const brightness = 1 + t * 1.0;
  const contrast = 1 + t * 0.5;
  return `
    .PSPDFKit-Spread { filter: brightness(${brightness}) contrast(${contrast}); }
    .PSPDFKit-Viewport { background-color: #fff; }
  `;
}

export default function BrightnessContrastViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [intensity, setIntensity] = useState(0);

  const applyIntensity = useCallback((value: number) => {
    const container = containerRef.current;
    if (!container) return;

    const root =
      container.querySelector(".PSPDFKit-Container")?.shadowRoot ?? container;

    let style = root.querySelector(
      `#${FILTER_STYLE_ID}`,
    ) as HTMLStyleElement | null;

    if (value === 0) {
      style?.remove();
      return;
    }

    if (!style) {
      style = document.createElement("style");
      style.id = FILTER_STYLE_ID;
      root.appendChild(style);
    }
    style.textContent = getFilterCSS(value);
  }, []);

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
          ["pager", "zoom-out", "zoom-in", "zoom-mode", "search"].includes(
            item.type,
          ),
      ),
    }).then((instance: Instance) => {
      instanceRef.current = instance;
    });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setIntensity(value);
    applyIntensity(value);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Slider control bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 16px",
          borderBottom: "1px solid #e5e7eb",
          backgroundColor: "#f9fafb",
          flexShrink: 0,
        }}
      >
        <SunIcon />
        <input
          type="range"
          min={-100}
          max={100}
          value={intensity}
          onChange={handleSliderChange}
          aria-label="Document brightness adjustment"
          style={{
            flex: 1,
            maxWidth: "300px",
            accentColor: "#6366f1",
            cursor: "pointer",
          }}
        />
        <MoonIcon />
        <span
          style={{
            fontSize: "13px",
            color: "#6b7280",
            minWidth: "80px",
            textAlign: "right",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {intensity === 0
            ? "Normal"
            : intensity > 0
              ? `Night ${intensity}%`
              : `Bright ${Math.abs(intensity)}%`}
        </span>
      </div>

      {/* Viewer */}
      <div ref={containerRef} style={{ flex: 1 }} />
    </div>
  );
}
