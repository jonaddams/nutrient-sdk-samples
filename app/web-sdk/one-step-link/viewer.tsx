"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef, useState } from "react";
import { normalizeUrl } from "./link";
import "./styles.css";

const DOCUMENT = "/documents/contract-template.pdf";

const LINK_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>';

const SWATCHES = ["#2563eb", "#dc2626", "#16a34a", "#7c3aed", "#111827"];

type PendingLink = { text: string; colorHex: string; url: string };

export default function OneStepLinkViewer() {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pendingRef = useRef<PendingLink | null>(null);
  const [isArmed, setIsArmed] = useState(false);
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [colorHex, setColorHex] = useState(SWATCHES[0]);
  const [errors, setErrors] = useState<{ text?: string; url?: string }>({});

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

  function resetForm() {
    setText("");
    setUrl("");
    setColorHex(SWATCHES[0]);
    setErrors({});
  }

  function handleSubmit() {
    const nextErrors: { text?: string; url?: string } = {};
    if (!text.trim()) nextErrors.text = "Link text is required";
    if (!url.trim()) nextErrors.url = "URL is required";
    if (nextErrors.text || nextErrors.url) {
      setErrors(nextErrors);
      return;
    }
    pendingRef.current = {
      text: text.trim(),
      colorHex,
      url: normalizeUrl(url),
    };
    setIsModalOpen(false);
    setIsArmed(true);
    resetForm();
  }

  function handleCancel() {
    setIsModalOpen(false);
    resetForm();
  }

  // Esc disarms a pending placement.
  useEffect(() => {
    if (!isArmed) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pendingRef.current = null;
        setIsArmed(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isArmed]);

  // Esc closes the modal, mirroring the overlay's click-to-dismiss action.
  useEffect(() => {
    if (!isModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsModalOpen(false);
        setText("");
        setUrl("");
        setColorHex(SWATCHES[0]);
        setErrors({});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isModalOpen]);

  return (
    <div className="osl-wrapper">
      <div className={`osl-viewer-shell${isArmed ? " osl-arming" : ""}`}>
        {isArmed && (
          <div className="osl-banner">
            Click where the link should go — press Esc to cancel
          </div>
        )}
        <div
          ref={containerRef}
          className="osl-viewer"
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {isModalOpen && (
        // biome-ignore lint/a11y/noStaticElementInteractions: Modal overlay requires click handler for dismissal
        // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click cancels the dialog; keyboard equivalent is the Escape handler bound on window above.
        <div className="osl-modal-overlay" onClick={handleCancel}>
          {/* biome-ignore lint/a11y/useKeyWithClickEvents: onClick here only stops propagation to the overlay's dismiss handler */}
          <div
            className="osl-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="osl-field">
              <label className="osl-label" htmlFor="osl-text">
                Link text
              </label>
              <input
                id="osl-text"
                className={`osl-input${errors.text ? " osl-invalid" : ""}`}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Terms and conditions"
              />
              {errors.text && <span className="osl-error">{errors.text}</span>}
            </div>

            <div className="osl-field">
              <label className="osl-label" htmlFor="osl-url">
                URL
              </label>
              <input
                id="osl-url"
                className={`osl-input${errors.url ? " osl-invalid" : ""}`}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="nutrient.io/terms"
              />
              {errors.url && <span className="osl-error">{errors.url}</span>}
            </div>

            <div className="osl-field">
              <span className="osl-label">Text color</span>
              <div className="osl-swatches">
                {SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`osl-swatch${colorHex === hex ? " osl-selected" : ""}`}
                    style={{ background: hex }}
                    aria-label={`Color ${hex}`}
                    onClick={() => setColorHex(hex)}
                  />
                ))}
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => setColorHex(e.target.value)}
                  aria-label="Custom color"
                />
              </div>
            </div>

            <div className="osl-modal-actions">
              <button type="button" className="osl-btn" onClick={handleCancel}>
                Cancel
              </button>
              <button
                type="button"
                className="osl-btn osl-btn-primary"
                onClick={handleSubmit}
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
