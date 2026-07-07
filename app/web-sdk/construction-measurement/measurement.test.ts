import { describe, expect, it } from "vitest";
import {
  lineBoundingBox,
  PIN_SIZE,
  pinBoundingBox,
  pinCenter,
  pointDrifted,
} from "./measurement";

describe("pinBoundingBox / pinCenter", () => {
  it("centers a PIN_SIZE box on the given point", () => {
    const box = pinBoundingBox({ x: 100, y: 200 });
    expect(box).toEqual({
      left: 100 - PIN_SIZE / 2,
      top: 200 - PIN_SIZE / 2,
      width: PIN_SIZE,
      height: PIN_SIZE,
    });
  });

  it("round-trips center -> box -> center", () => {
    const center = { x: 42, y: 99 };
    expect(pinCenter(pinBoundingBox(center))).toEqual(center);
  });
});

describe("lineBoundingBox", () => {
  it("encloses both points with padding, regardless of order", () => {
    const forward = lineBoundingBox({ x: 10, y: 10 }, { x: 40, y: 30 });
    const reversed = lineBoundingBox({ x: 40, y: 30 }, { x: 10, y: 10 });
    expect(forward).toEqual(reversed);
    expect(forward.left).toBeLessThanOrEqual(10);
    expect(forward.top).toBeLessThanOrEqual(10);
    expect(forward.left + forward.width).toBeGreaterThanOrEqual(40);
    expect(forward.top + forward.height).toBeGreaterThanOrEqual(30);
  });

  it("stays valid (positive extent) for a zero-length line", () => {
    const box = lineBoundingBox({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(box.width).toBeGreaterThan(0);
    expect(box.height).toBeGreaterThan(0);
  });
});

describe("pointDrifted", () => {
  it("is false for identical points and true past the threshold", () => {
    expect(pointDrifted({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(false);
    expect(pointDrifted({ x: 1, y: 1 }, { x: 1.2, y: 1 })).toBe(false);
    expect(pointDrifted({ x: 1, y: 1 }, { x: 3, y: 1 })).toBe(true);
  });
});
