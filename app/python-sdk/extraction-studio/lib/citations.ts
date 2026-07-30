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

type RGB = { r: number; g: number; b: number };

// Fixed, palette-independent greens. These are NOT derived from --accent on
// purpose: annotation colors are set in JS on the PDF canvas so they cannot
// read CSS custom properties, and --accent is #ffffff in the dark-mono
// palette — invisible on white paper. The document is white regardless of
// the app's theme, so a fixed pair is the correct choice, not a shortcut.
const GREEN: RGB = { r: 74, g: 157, b: 106 };
const GREEN_DEEP: RGB = { r: 30, g: 107, b: 63 };

export const CITATION_STYLES: Record<
  CitationStyle,
  { fill: RGB; stroke: RGB; opacity: number; strokeWidth: number }
> = {
  base: { fill: GREEN, stroke: GREEN_DEEP, opacity: 0.22, strokeWidth: 1 },
  dimmed: { fill: GREEN, stroke: GREEN, opacity: 0.07, strokeWidth: 1 },
  active: { fill: GREEN, stroke: GREEN_DEEP, opacity: 0.4, strokeWidth: 3 },
};

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
// exactly two, so one code path covers both without special-casing.
export function diffStyles(
  prev: Map<number, CitationStyle>,
  next: Map<number, CitationStyle>,
): number[] {
  const changed: number[] = [];
  next.forEach((style, fieldIndex) => {
    if (prev.get(fieldIndex) !== style) changed.push(fieldIndex);
  });
  return changed;
}
