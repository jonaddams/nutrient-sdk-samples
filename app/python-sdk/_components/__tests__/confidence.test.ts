import { describe, expect, it } from "vitest";
import { confidenceBg, confidenceColor } from "../confidence";

describe("confidenceColor", () => {
  it("is green at or above 0.7", () => {
    expect(confidenceColor(0.7)).toContain("data-green");
    expect(confidenceColor(0.95)).toContain("data-green");
  });
  it("is yellow between 0.4 and 0.7", () => {
    expect(confidenceColor(0.5)).toContain("yellow");
  });
  it("is red below 0.4", () => {
    expect(confidenceColor(0.2)).toContain("red");
  });
});

describe("confidenceBg", () => {
  it("returns a green background at high confidence", () => {
    expect(confidenceBg(0.8)).toContain("green");
  });
  it("returns a red background at low confidence", () => {
    expect(confidenceBg(0.1)).toContain("red");
  });
});
