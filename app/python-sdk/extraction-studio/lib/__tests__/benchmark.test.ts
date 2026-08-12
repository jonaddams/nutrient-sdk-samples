import { describe, expect, test } from "vitest";
import { BENCHMARK } from "../benchmark";
import { findDoc } from "../docs";
import { VERIFIED } from "../verified";

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

  // The caveat text in StructuredResults asserts this to a prospect: "every
  // row is scored out of the same denominator." Nothing enforced that claim
  // before this test — it happened to hold because every provider ran against
  // the same answer key, not because anything would fail if it stopped
  // holding. Pin it: one document's rows must all share one `verified` count,
  // and that count must equal the size of that document's answer key (the
  // number of fields VERIFIED actually grades, which can be smaller than the
  // number of fields the schema extracts — see verified.ts's deliberately
  // ungraded fields).
  test("every document's rows share one denominator, sized to its answer key", () => {
    const byDoc = new Map<string, number[]>();
    for (const r of BENCHMARK.rows) {
      const list = byDoc.get(r.docId) ?? [];
      list.push(r.verified);
      byDoc.set(r.docId, list);
    }

    for (const [docId, verifiedCounts] of byDoc) {
      const answerKeySize = Object.keys(VERIFIED[docId] ?? {}).length;
      for (const verified of verifiedCounts) {
        expect(
          verified,
          `${docId}: row verified=${verified} does not match answer-key size ${answerKeySize}`,
        ).toBe(answerKeySize);
      }
    }
  });
});
