export type Point = { x: number; y: number };

export type BoundingBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type LinkInput = {
  pageIndex: number;
  point: Point;
  text: string;
  colorHex: string;
  url: string;
  fontSize: number;
};

export const DEFAULT_FONT_SIZE = 14;

// Character-width factor and line-height factor are rough approximations that
// look right for a demo. The link box does not need pixel-perfect sizing.
const CHAR_WIDTH_FACTOR = 0.55;
const LINE_HEIGHT_FACTOR = 1.4;
const MIN_WIDTH = 24;

/** Prepend https:// unless the string already has a scheme (http, mailto, etc.). */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Size a bounding box to the label text, using the click point as the top-left origin. */
export function computeBoundingBox(
  point: Point,
  text: string,
  fontSize: number,
): BoundingBox {
  const width = Math.max(MIN_WIDTH, text.length * fontSize * CHAR_WIDTH_FACTOR);
  const height = fontSize * LINE_HEIGHT_FACTOR;
  return { left: point.x, top: point.y, width, height };
}

/**
 * Build the two annotations that together form a visible, clickable link,
 * sharing one bounding box. `NV` is `window.NutrientViewer`, passed in so this
 * module stays free of a hard SDK import.
 */
export function buildLinkAnnotations(NV: any, input: LinkInput) {
  const { pageIndex, point, text, colorHex, url, fontSize } = input;
  const box = new NV.Geometry.Rect(computeBoundingBox(point, text, fontSize));
  const color = NV.Color.fromHex(colorHex);

  const textAnnotation = new NV.Annotations.TextAnnotation({
    pageIndex,
    boundingBox: box,
    text: { format: "plain", value: text },
    font: "Helvetica",
    fontSize,
    fontColor: color,
    isUnderline: true,
    horizontalAlign: "left",
    verticalAlign: "center",
  });

  const linkAnnotation = new NV.Annotations.LinkAnnotation({
    pageIndex,
    boundingBox: box,
    action: new NV.Actions.URIAction({ uri: normalizeUrl(url) }),
  });

  return [textAnnotation, linkAnnotation] as const;
}
