"use client";
import { useEffect, useState } from "react";
import { CITATION_PRESETS, hexToRgb, rgbToHex } from "../lib/citations";

/**
 * Preset swatches plus a free color choice for the citation highlights.
 *
 * The committed value is always a valid 6-digit hex, so the annotation layer
 * never has to defend against half-typed input. The text field keeps its own
 * draft state for exactly that reason: while someone types "#ff", that string is
 * unparseable and must not be pushed to the canvas.
 */
export function CitationColor({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  // Follow external changes (a preset click, or a reset) without clobbering
  // what the user is mid-way through typing.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = (raw: string) => {
    const rgb = hexToRgb(raw);
    if (rgb) onChange(rgbToHex(rgb));
    // Invalid input is simply not committed. The draft keeps whatever was
    // typed so it can be corrected, rather than being yanked back mid-edit.
  };

  const activePreset = CITATION_PRESETS.find(
    (p) => p.hex.toLowerCase() === value.toLowerCase(),
  );

  return (
    <div className="citation-color">
      <span className="eyebrow">Citation color</span>

      <div className="citation-swatches">
        {CITATION_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className="citation-swatch"
            style={{ background: p.hex }}
            aria-label={p.label}
            aria-pressed={p.id === activePreset?.id}
            onClick={() => onChange(p.hex)}
          />
        ))}

        {/* Native picker: the OS eyedropper and gamut are worth more here than
            anything hand-rolled, and it degrades to a text field where absent. */}
        <input
          type="color"
          className="citation-color-native"
          value={value}
          aria-label="Pick a custom citation color"
          onChange={(e) => onChange(e.target.value)}
        />

        <input
          type="text"
          className="citation-hex mono"
          value={draft}
          spellCheck={false}
          aria-label="Citation color hex value"
          placeholder="#ffc107"
          onChange={(e) => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setDraft(value)}
        />
      </div>
    </div>
  );
}
