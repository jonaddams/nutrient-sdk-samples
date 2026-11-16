import { describe, expect, it } from "vitest";
import { boxesOverlap, findRange, layoutWarnings, toolSchemas } from "./tools";

describe("findRange", () => {
  it("finds the first occurrence by default", () => {
    expect(findRange("rate of $150 per hour", "$150")).toEqual({
      begin: 8,
      end: 12,
    });
  });

  it("finds the n-th occurrence", () => {
    expect(findRange("a-b-a-b", "a", 2)).toEqual({ begin: 4, end: 5 });
  });

  it("returns null when the occurrence does not exist", () => {
    expect(findRange("a-b", "a", 2)).toBeNull();
    expect(findRange("a-b", "z")).toBeNull();
  });
});

describe("boxesOverlap", () => {
  const a = { left: 0, top: 0, width: 100, height: 20 };

  it("detects a real overlap", () => {
    expect(boxesOverlap(a, { left: 50, top: 10, width: 100, height: 20 })).toBe(
      true,
    );
  });

  it("ignores boxes that only touch", () => {
    expect(boxesOverlap(a, { left: 0, top: 20, width: 100, height: 20 })).toBe(
      false,
    );
  });
});

describe("layoutWarnings", () => {
  const page = { width: 612, height: 792 };
  const below = {
    id: "0-p-2",
    text: "Next paragraph",
    boundingBox: { left: 72, top: 140, width: 400, height: 30 },
  };

  it("reports an overlap the edit created", () => {
    const before = { left: 72, top: 100, width: 400, height: 30 };
    const after = { left: 72, top: 100, width: 400, height: 60 };
    const [warning] = layoutWarnings(before, after, [below], page);
    expect(warning).toContain("0-p-2");
  });

  it("does not blame the edit for an overlap that already existed", () => {
    const before = { left: 72, top: 100, width: 400, height: 50 };
    const after = { left: 72, top: 100, width: 400, height: 60 };
    expect(layoutWarnings(before, after, [below], page)).toEqual([]);
  });

  it("reports spilling past the page edge", () => {
    const after = { left: 72, top: 780, width: 400, height: 30 };
    expect(layoutWarnings(null, after, [], page)).toEqual([
      "Block now extends past the page edge.",
    ]);
  });
});

describe("tool input validation (model output is untrusted)", () => {
  it("rejects a non-hex color", () => {
    const r = toolSchemas.set_paragraph_text_style.safeParse({
      ids: ["0-p-1"],
      style: { color: "red" },
    });
    expect(r.success).toBe(false);
  });

  it("rejects unknown style keys", () => {
    const r = toolSchemas.set_paragraph_text_style.safeParse({
      ids: ["0-p-1"],
      style: { underline: true },
    });
    expect(r.success).toBe(false);
  });

  it("replace_paragraph needs exactly one of edit or text", () => {
    const edit = { find: "$150", replace: "$175" };
    const s = toolSchemas.replace_paragraph;
    expect(s.safeParse({ id: "0-p-1", edit }).success).toBe(true);
    expect(s.safeParse({ id: "0-p-1", text: "New" }).success).toBe(true);
    expect(s.safeParse({ id: "0-p-1" }).success).toBe(false);
    expect(s.safeParse({ id: "0-p-1", edit, text: "New" }).success).toBe(false);
  });
});
