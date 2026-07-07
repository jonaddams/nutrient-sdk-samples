export type Point = { x: number; y: number };

export type BoundingBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

// One measurement = two pins + the line linking them, matched by pairId.
export type Measurement = {
  pairId: string;
  pinAId: string;
  pinBId: string;
  lineId: string;
  pageIndex: number;
};

// Diameter of the round pin marker, in page-space units.
export const PIN_SIZE = 14;

// 2-decimal feet, e.g. "24.50 ft". See measurementPrecision in the SDK types.
export const MEASUREMENT_PRECISION = "twoDp";

// Fixed scale for floor-plan-layers.pdf: SCALE_FROM_VALUE page-inches map to
// SCALE_TO_VALUE feet in the real world. Calibrated in Task 6 against a known
// dimension on the plan; placeholder 1:1 until then.
export const SCALE_FROM_VALUE = 1;
export const SCALE_TO_VALUE = 1;

export function pinBoundingBox(center: Point): BoundingBox {
  const half = PIN_SIZE / 2;
  return {
    left: center.x - half,
    top: center.y - half,
    width: PIN_SIZE,
    height: PIN_SIZE,
  };
}

export function pinCenter(bbox: BoundingBox): Point {
  return {
    x: bbox.left + bbox.width / 2,
    y: bbox.top + bbox.height / 2,
  };
}

// The line's bounding box must cover both endpoints (plus a little pad) or the
// annotation won't render.
export function lineBoundingBox(a: Point, b: Point): BoundingBox {
  const pad = 4;
  const minX = Math.min(a.x, b.x) - pad;
  const minY = Math.min(a.y, b.y) - pad;
  const maxX = Math.max(a.x, b.x) + pad;
  const maxY = Math.max(a.y, b.y) + pad;
  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
}

export function pointDrifted(a: Point, b: Point, threshold = 0.5): boolean {
  return Math.abs(a.x - b.x) > threshold || Math.abs(a.y - b.y) > threshold;
}

/* SDK annotation builders. `NV` is window.NutrientViewer, passed in to avoid
   importing the runtime bundle. Return values are SDK annotation instances. */

// Shared color for pins and the measurement line (blue-600).
export const PIN_COLOR = { r: 37, g: 99, b: 235 };

export function buildPin(
  // biome-ignore lint/suspicious/noExplicitAny: SDK namespace
  NV: any,
  args: { pairId: string; slot: "a" | "b"; pageIndex: number; center: Point },
) {
  const { pairId, slot, pageIndex, center } = args;
  return new NV.Annotations.EllipseAnnotation({
    pageIndex,
    boundingBox: new NV.Geometry.Rect(pinBoundingBox(center)),
    strokeColor: new NV.Color(PIN_COLOR),
    fillColor: new NV.Color(PIN_COLOR),
    strokeWidth: 1,
    customData: { role: "pin", pairId, slot },
  });
}

// biome-ignore lint/suspicious/noExplicitAny: SDK namespace
export function buildMeasurementScale(NV: any) {
  return new NV.MeasurementScale({
    unitFrom: NV.MeasurementScaleUnitFrom.INCHES,
    unitTo: NV.MeasurementScaleUnitTo.FEET,
    fromValue: SCALE_FROM_VALUE,
    toValue: SCALE_TO_VALUE,
  });
}

export function buildMeasurementLine(
  // biome-ignore lint/suspicious/noExplicitAny: SDK namespace
  NV: any,
  args: { pairId: string; pageIndex: number; a: Point; b: Point },
) {
  const { pairId, pageIndex, a, b } = args;
  return new NV.Annotations.LineAnnotation({
    pageIndex,
    startPoint: new NV.Geometry.Point(a),
    endPoint: new NV.Geometry.Point(b),
    boundingBox: new NV.Geometry.Rect(lineBoundingBox(a, b)),
    strokeColor: new NV.Color(PIN_COLOR),
    strokeWidth: 2,
    measurementScale: buildMeasurementScale(NV),
    measurementPrecision: MEASUREMENT_PRECISION,
    customData: { role: "line", pairId },
  });
}
