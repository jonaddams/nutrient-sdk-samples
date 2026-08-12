import { describe, expect, test } from "vitest";
import { BENCHMARK } from "../benchmark";
import { findDoc } from "../docs";

describe("benchmark data", () => {
  test("every row names a real document", () => {
    for (const r of BENCHMARK.rows) {
      expect(findDoc(r.docId), `unknown docId: ${r.docId}`).toBeDefined();
    }
  });

  test("matched never exceeds verified", () => {
    for (const r of BENCHMARK.rows) {
      expect(r.matched).toBeLessThanOrEqual(r.verified);
    }
  });

  test("it carries a measurement date", () => {
    // The date is shown in the UI. A table without one is a claim with no
    // shelf life, which is how a benchmark becomes a lie on a schedule.
    expect(BENCHMARK.measuredOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
