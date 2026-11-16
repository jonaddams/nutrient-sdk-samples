import { describe, expect, it } from "vitest";
import { countOccurrences } from "./outline";

describe("countOccurrences", () => {
  it("counts earlier body mentions case-insensitively, so the heading is the next match", () => {
    const body =
      "the ingestion queue, the document conversion workers, and replication\n";
    expect(countOccurrences(body, "Conversion workers")).toBe(1);
  });

  it("counts non-overlapping matches", () => {
    expect(countOccurrences("aaaa", "aa")).toBe(2);
  });

  it("returns 0 for no match or an empty needle", () => {
    expect(countOccurrences("Executive Summary", "Pricing")).toBe(0);
    expect(countOccurrences("anything", "")).toBe(0);
  });
});
