/* biome-ignore-all lint/suspicious/noExplicitAny: Nutrient SDK annotation types not fully exported */

export type Point = { x: number; y: number };

export type BoundingBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type Callout = {
  calloutId: string;
  number: number;
  description: string;
  bubbleAnnotationId: string;
  leaderAnnotationId: string;
  pageIndex: number;
};

export type SeedCallout = {
  number: number;
  description: string;
  bubble: Point;
  tip: Point;
};

export const BUBBLE_SIZE = 36;

// Coordinates are in page space for page 0 of floor-plan-layers.pdf.
// Adjusted during Task 5 after visual inspection in the dev server.
export const SEED_CALLOUTS: SeedCallout[] = [
  {
    number: 1,
    description: "HVAC return duct obstruction",
    bubble: { x: 180, y: 160 },
    tip: { x: 260, y: 220 },
  },
  {
    number: 2,
    description: "Missing fire extinguisher mount",
    bubble: { x: 420, y: 200 },
    tip: { x: 520, y: 260 },
  },
  {
    number: 3,
    description: "Electrical panel clearance violation",
    bubble: { x: 200, y: 380 },
    tip: { x: 300, y: 440 },
  },
  {
    number: 4,
    description: "Damaged floor tile",
    bubble: { x: 480, y: 420 },
    tip: { x: 560, y: 480 },
  },
];

export function computeBubbleCenter(bbox: BoundingBox): Point {
  return {
    x: bbox.left + bbox.width / 2,
    y: bbox.top + bbox.height / 2,
  };
}

export function bubbleBoundingBox(center: Point): BoundingBox {
  const half = BUBBLE_SIZE / 2;
  return {
    left: center.x - half,
    top: center.y - half,
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
  };
}

// Builds the (bubble, leader) annotation pair but does not submit to the viewer.
// Callers pass in `NV` (window.NutrientViewer) to avoid circular module loading.
export function buildCalloutAnnotations(
  NV: any,
  args: {
    calloutId: string;
    number: number;
    pageIndex: number;
    bubbleCenter: Point;
    tipPoint: Point;
  },
) {
  const { calloutId, number, pageIndex, bubbleCenter, tipPoint } = args;
  const box = bubbleBoundingBox(bubbleCenter);

  const bubble = new NV.Annotations.NoteAnnotation({
    pageIndex,
    boundingBox: new NV.Geometry.Rect(box),
    text: { format: "plain" as const, value: String(number) },
    color: NV.Color.TRANSPARENT,
    customData: { calloutId, role: "bubble", number },
  });

  const leader = new NV.Annotations.LineAnnotation({
    pageIndex,
    startPoint: new NV.Geometry.Point(bubbleCenter),
    endPoint: new NV.Geometry.Point(tipPoint),
    boundingBox: new NV.Geometry.Rect(
      leaderBoundingBox(bubbleCenter, tipPoint),
    ),
    strokeColor: new NV.Color({ r: 220, g: 38, b: 38 }),
    strokeWidth: 2,
    lineCaps: { end: "openArrow" },
    customData: { calloutId, role: "leader" },
  });

  return { bubble, leader };
}

// Recomputes the leader's bounding box after either endpoint moves.
// The bounding box must cover both endpoints or the line won't render.
export function leaderBoundingBox(start: Point, end: Point): BoundingBox {
  const pad = 4;
  const minX = Math.min(start.x, end.x) - pad;
  const minY = Math.min(start.y, end.y) - pad;
  const maxX = Math.max(start.x, end.x) + pad;
  const maxY = Math.max(start.y, end.y) + pad;
  return {
    left: minX,
    top: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Returns true if two points differ by more than ~0.5px on either axis.
export function pointDrifted(a: Point, b: Point, threshold = 0.5): boolean {
  return Math.abs(a.x - b.x) > threshold || Math.abs(a.y - b.y) > threshold;
}

type RendererResult = {
  node: HTMLElement;
  append: boolean;
};

export function renderBubble(annotation: any): RendererResult | null {
  if (annotation.customData?.role !== "bubble") return null;

  const number = annotation.customData?.number ?? annotation.text?.value ?? "";
  const numberStr = String(number);

  const node = document.createElement("div");
  node.className = "callout-bubble";
  node.setAttribute("data-digits", String(numberStr.length));
  node.textContent = numberStr;

  const highlightVersion = annotation.customData?.highlightVersion;
  if (
    typeof highlightVersion === "number" &&
    Date.now() - highlightVersion < 1600
  ) {
    node.classList.add("highlight");
  }

  return { node, append: false };
}
