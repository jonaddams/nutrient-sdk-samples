/**
 * Citation highlight appearance.
 *
 * Ported from `python-sdk/extraction-studio/lib/citations.ts` rather than
 * reinvented — these numbers were paid for.
 *
 * The colours are deliberately NOT design-system tokens. Annotations are set in
 * JS on the PDF canvas, which cannot read CSS custom properties, and the accent
 * token is #ffffff in the dark palette — invisible on white paper. The document
 * is white whatever the app theme is, so an explicit hex is correct here rather
 * than a shortcut. This is the one place the design system does not govern.
 */

export type CitationStyle = "base" | "dimmed" | "active";
export type RGB = { r: number; g: number; b: number };

export const CITATION_HEX = "#ffc107";

/**
 * Opacity and stroke per style, independent of hue.
 *
 * These were originally 0.22 / 0.07 / 0.40 and were raised after a demo where
 * the highlights were barely visible on a scanned page. `dimmed` at 0.07 was the
 * worst of it: selecting one field made every other citation effectively vanish.
 * The fill stays translucent on purpose — it sits over the value it marks, and
 * an opaque wash hides the number the citation is pointing at.
 */
const WEIGHT: Record<CitationStyle, { opacity: number; strokeWidth: number }> =
  {
    base: { opacity: 0.38, strokeWidth: 1 },
    dimmed: { opacity: 0.16, strokeWidth: 1 },
    active: { opacity: 0.55, strokeWidth: 3 },
  };

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

/** Stroke is the fill darkened, so the outline reads against its own fill. */
function deepen({ r, g, b }: RGB, factor = 0.6): RGB {
  return {
    r: Math.round(r * factor),
    g: Math.round(g * factor),
    b: Math.round(b * factor),
  };
}

export function appearance(style: CitationStyle, hex: string = CITATION_HEX) {
  const fill = hexToRgb(hex) ?? hexToRgb(CITATION_HEX);
  if (!fill) throw new Error("CITATION_HEX is not a valid hex colour");
  return { fill, stroke: deepen(fill), ...WEIGHT[style] };
}

/**
 * With nothing selected every citation reads equally. Once one is selected it
 * becomes dominant and the rest recede, so the tie to the document stays
 * unambiguous even on a page dense with citations.
 */
export function styleFor(
  path: string,
  activePath: string | null,
): CitationStyle {
  if (activePath == null) return "base";
  return path === activePath ? "active" : "dimmed";
}
