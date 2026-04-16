import { describe, expect, it } from "vitest";
import {
  BUBBLE_SIZE,
  bubbleBoundingBox,
  computeBubbleCenter,
  leaderBoundingBox,
  pointDrifted,
} from "../callouts";

describe("computeBubbleCenter", () => {
  it("returns the geometric center of a bounding box", () => {
    const bbox = { left: 100, top: 200, width: 36, height: 36 };
    expect(computeBubbleCenter(bbox)).toEqual({ x: 118, y: 218 });
  });

  it("handles non-square boxes", () => {
    const bbox = { left: 0, top: 0, width: 40, height: 20 };
    expect(computeBubbleCenter(bbox)).toEqual({ x: 20, y: 10 });
  });
});

describe("bubbleBoundingBox", () => {
  it("returns a square centered on the point", () => {
    const bbox = bubbleBoundingBox({ x: 100, y: 200 });
    expect(bbox.width).toBe(BUBBLE_SIZE);
    expect(bbox.height).toBe(BUBBLE_SIZE);
    expect(bbox.left).toBe(100 - BUBBLE_SIZE / 2);
    expect(bbox.top).toBe(200 - BUBBLE_SIZE / 2);
  });
});

describe("leaderBoundingBox", () => {
  it("covers both endpoints with padding", () => {
    const bbox = leaderBoundingBox({ x: 10, y: 10 }, { x: 50, y: 80 });
    expect(bbox.left).toBeLessThanOrEqual(10);
    expect(bbox.top).toBeLessThanOrEqual(10);
    expect(bbox.left + bbox.width).toBeGreaterThanOrEqual(50);
    expect(bbox.top + bbox.height).toBeGreaterThanOrEqual(80);
  });

  it("handles reversed endpoints (tip left of bubble)", () => {
    const bbox = leaderBoundingBox({ x: 50, y: 80 }, { x: 10, y: 10 });
    expect(bbox.left).toBeLessThanOrEqual(10);
    expect(bbox.left + bbox.width).toBeGreaterThanOrEqual(50);
  });
});

describe("pointDrifted", () => {
  it("returns false for identical points", () => {
    expect(pointDrifted({ x: 10, y: 10 }, { x: 10, y: 10 })).toBe(false);
  });

  it("returns false for sub-threshold differences", () => {
    expect(pointDrifted({ x: 10, y: 10 }, { x: 10.3, y: 10.3 })).toBe(false);
  });

  it("returns true for drift on either axis", () => {
    expect(pointDrifted({ x: 10, y: 10 }, { x: 11, y: 10 })).toBe(true);
    expect(pointDrifted({ x: 10, y: 10 }, { x: 10, y: 11 })).toBe(true);
  });
});
