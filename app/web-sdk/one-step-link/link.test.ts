import { describe, expect, it } from "vitest";
import { computeBoundingBox, DEFAULT_FONT_SIZE, normalizeUrl } from "./link";

describe("normalizeUrl", () => {
  it("prepends https:// when no scheme is present", () => {
    expect(normalizeUrl("nutrient.io")).toBe("https://nutrient.io");
  });

  it("preserves an existing http scheme", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("preserves an existing https scheme", () => {
    expect(normalizeUrl("https://example.com/a?b=c")).toBe(
      "https://example.com/a?b=c",
    );
  });

  it("trims surrounding whitespace before normalizing", () => {
    expect(normalizeUrl("  nutrient.io  ")).toBe("https://nutrient.io");
  });

  it("preserves mailto links", () => {
    expect(normalizeUrl("mailto:hi@nutrient.io")).toBe("mailto:hi@nutrient.io");
  });
});

describe("computeBoundingBox", () => {
  it("uses the click point as the top-left origin", () => {
    const box = computeBoundingBox({ x: 100, y: 200 }, "Terms", 14);
    expect(box.left).toBe(100);
    expect(box.top).toBe(200);
  });

  it("scales width with text length and font size", () => {
    const short = computeBoundingBox({ x: 0, y: 0 }, "Hi", 14);
    const long = computeBoundingBox({ x: 0, y: 0 }, "Much longer label", 14);
    expect(long.width).toBeGreaterThan(short.width);
  });

  it("scales height with font size", () => {
    const small = computeBoundingBox({ x: 0, y: 0 }, "Terms", 14);
    const big = computeBoundingBox({ x: 0, y: 0 }, "Terms", 28);
    expect(big.height).toBeGreaterThan(small.height);
  });

  it("uses DEFAULT_FONT_SIZE of 14", () => {
    expect(DEFAULT_FONT_SIZE).toBe(14);
  });
});
