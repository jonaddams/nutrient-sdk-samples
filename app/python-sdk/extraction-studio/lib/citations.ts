import type { Citation } from "./api";

// Round to kill floating-point noise from fractional multiplication
// (e.g. (0.3 - 0.1) * 1000 === 199.99999999999997 in IEEE754) while
// retaining far more precision than any PDF-point rect needs.
function round(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function fracToRect(c: Citation, pageWidth: number, pageHeight: number) {
  return {
    left: round(c.x0 * pageWidth),
    top: round(c.y0 * pageHeight),
    width: round((c.x1 - c.x0) * pageWidth),
    height: round((c.y1 - c.y0) * pageHeight),
  };
}

export type CitationStyle = "base" | "dimmed" | "active";

export type RGB = { r: number; g: number; b: number };

// Annotation colors are NOT derived from --accent, and must not be: they are set
// in JS on the PDF canvas so they cannot read CSS custom properties, and
// --accent is #ffffff in the dark-mono palette — invisible on white paper. The
// document is white regardless of the app's theme, so an explicit color is the
// correct choice here, not a shortcut.
export const CITATION_PRESETS: { id: string; label: string; hex: string }[] = [
  { id: "amber", label: "Amber", hex: "#ffc107" },
  { id: "green", label: "Green", hex: "#34c759" },
  { id: "cyan", label: "Cyan", hex: "#00a3e0" },
  { id: "magenta", label: "Magenta", hex: "#d63384" },
];

export const DEFAULT_CITATION_HEX = CITATION_PRESETS[0].hex;

// Opacity and stroke weight per style, independent of hue.
//
// These were 0.22 / 0.07 / 0.40 and were raised after a demo where the
// highlights could barely be seen on a scanned page. `dimmed` at 0.07 was the
// worst of it: selecting one citation made every OTHER one effectively vanish.
// The fill stays translucent on purpose — it sits over the text it marks, and
// an opaque wash would hide the value the citation is pointing at.
const WEIGHT: Record<CitationStyle, { opacity: number; strokeWidth: number }> =
  {
    base: { opacity: 0.38, strokeWidth: 1 },
    dimmed: { opacity: 0.16, strokeWidth: 1 },
    active: { opacity: 0.55, strokeWidth: 3 },
  };

/** Accepts `#rgb`, `#rrggbb`, or either without the `#`. Null when unparseable,
 *  so callers can reject typed input instead of painting something arbitrary. */
export function hexToRgb(hex: string): RGB | null {
  const s = hex.trim().replace(/^#/, "");
  const full = s.length === 3 ? [...s].map((c) => c + c).join("") : s;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Stroke color: the fill darkened, so the outline reads against its own fill at
 *  any hue. Replaces the hand-picked GREEN/GREEN_DEEP pair, which could not
 *  generalise to a user-chosen color. */
function deepen({ r, g, b }: RGB, factor = 0.6): RGB {
  return {
    r: Math.round(r * factor),
    g: Math.round(g * factor),
    b: Math.round(b * factor),
  };
}

/** Resolve a style key plus a color into what the annotation actually gets. */
export function appearance(
  style: CitationStyle,
  hex: string,
): { fill: RGB; stroke: RGB; opacity: number; strokeWidth: number } {
  const fill = hexToRgb(hex) ?? hexToRgb(DEFAULT_CITATION_HEX);
  if (!fill) throw new Error("DEFAULT_CITATION_HEX is not a valid hex color");
  return { fill, stroke: deepen(fill), ...WEIGHT[style] };
}

/**
 * What a given annotation was last painted with. The color is part of it on
 * purpose: `diffStyles` compares these to decide what to restyle, and if it only
 * tracked the style KEY then changing the color while the selection stayed put
 * would produce an empty diff — every key unchanged — and the new color would
 * never reach the canvas. The picker would look broken.
 */
export type PaintedStyle = { style: CitationStyle; hex: string };

// With no selection every citation reads equally. Once one is selected it
// becomes dominant and the rest recede, so the tie to the document is
// unambiguous even on a page dense with citations.
export function styleFor(
  fieldIndex: number,
  activeIndex: number | null,
): CitationStyle {
  if (activeIndex == null) return "base";
  return fieldIndex === activeIndex ? "active" : "dimmed";
}

export type IndexedCitation = { fieldIndex: number; citation: Citation };

// Carries each citation's OWN field index. Compacting to a bare array and
// indexing into it later silently misaligns as soon as one field has no
// citation — the bug fixed in 77fa9c1.
export function indexCitations(
  fields: { citation: Citation | null }[],
): IndexedCitation[] {
  const out: IndexedCitation[] = [];
  fields.forEach((f, fieldIndex) => {
    if (f.citation) out.push({ fieldIndex, citation: f.citation });
  });
  return out;
}

// Which field indexes need their annotation restyled. The first selection
// changes every citation (base → dimmed/active); each one after that changes
// exactly two, so one code path covers both without special-casing. A color
// change also lands here, and changes every citation — which is why PaintedStyle
// carries the hex and this compares both fields rather than using `!==` on the
// style key alone.
export function diffStyles(
  prev: Map<number, PaintedStyle>,
  next: Map<number, PaintedStyle>,
): number[] {
  const changed: number[] = [];
  next.forEach((painted, fieldIndex) => {
    const before = prev.get(fieldIndex);
    if (
      !before ||
      before.style !== painted.style ||
      before.hex !== painted.hex
    ) {
      changed.push(fieldIndex);
    }
  });
  return changed;
}
