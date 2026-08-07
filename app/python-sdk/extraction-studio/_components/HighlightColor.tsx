"use client";
import { useEffect, useState } from "react";
import { DropperIcon } from "@/app/_components/icons";
import { CITATION_PRESETS, hexToRgb, rgbToHex } from "../lib/citations";

/**
 * Preset swatches plus a free color choice for a highlight layer.
 *
 * Shared by both results panels: structured extraction calls these citations,
 * OCR calls them regions, so the noun arrives as `label` rather than being
 * hardcoded — including in the aria-labels, which is the whole reason it is a
 * prop and not just a heading.
 *
 * The committed value is always a valid 6-digit hex, so the annotation layer
 * never has to defend against half-typed input. The text field keeps its own
 * draft state for exactly that reason: while someone types "#ff", that string is
 * unparseable and must not be pushed to the canvas.
 */
export function HighlightColor({
  label,
  embedded,
  value,
  onChange,
}: {
  label: string;
  /** Set when the parent already renders its own `.citation-color` block
   *  around this control (its eyebrow label, its padding). Renders the
   *  swatch row alone, as a fragment, instead of a second nested
   *  `.citation-color` — nesting them double-applies that block's padding,
   *  since the shared CSS rule matches both regardless of depth. Also
   *  suppresses the visible label; the aria-labels still derive from
   *  `label` unconditionally, so nothing is lost to a screen reader. */
  embedded?: boolean;
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

  const content = (
    <>
      {!embedded && <span className="eyebrow">{label}</span>}

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

        {/* Native picker, behind a dropper icon. Shown as an icon rather than a
            colour swatch because a fifth coloured square beside four preset
            squares reads as another preset, not as a control — and when it
            mirrored the active colour it looked like a duplicate of it.

            The input stays a real <input type="color"> inside the label, so the
            OS picker, gamut and system eyedropper all still work; only its
            chrome is replaced. Ringed like a preset when the current value is
            NOT one of them, so a custom colour still has a visible home. */}
        <label
          className="citation-picker"
          data-custom={activePreset ? undefined : "true"}
        >
          <DropperIcon width={13} height={13} />
          {/* The corner dot is what makes a CUSTOM colour visible: without it the
              only place a hand-picked colour appeared was the hex field, since
              this control deliberately does not tint itself. Kept to a dot in
              the bottom-right — where the dropper glyph has no ink, it runs
              top-right to bottom-left — so it reads as a state indicator on a
              control rather than turning the button back into a swatch. */}
          <span
            className="citation-dot"
            style={{ background: value }}
            aria-hidden="true"
          />
          <input
            type="color"
            className="citation-color-native"
            value={value}
            aria-label={`Pick a custom ${label.toLowerCase()}`}
            onChange={(e) => onChange(e.target.value)}
          />
        </label>

        <input
          type="text"
          className="citation-hex mono"
          value={draft}
          spellCheck={false}
          aria-label={`${label} hex value`}
          placeholder="#ffc107"
          onChange={(e) => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
          onBlur={() => setDraft(value)}
        />
      </div>
    </>
  );

  // Structured Extraction (embedded unset) gets its own `.citation-color`
  // wrapper — one dose of the shared block padding. OCR's Custom mode
  // (embedded) is already inside its parent's `.citation-color`, so a second
  // wrapper here would double that padding: the CSS rule keys on the class,
  // not on nesting depth.
  return embedded ? content : <div className="citation-color">{content}</div>;
}
