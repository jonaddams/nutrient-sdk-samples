import { describe, expect, test } from "vitest";
import type { Citation } from "../api";
import {
  CITATION_STYLES,
  type CitationStyle,
  diffStyles,
  fracToRect,
  indexCitations,
  styleFor,
} from "../citations";

const cite = (page: number): Citation => ({ page, x0: 0, y0: 0, x1: 1, y1: 1 });

test("fracToRect maps 0..1 coords to a PDF-point rect (origin top-left)", () => {
  const r = fracToRect(
    { page: 0, x0: 0.1, y0: 0.1, x1: 0.3, y1: 0.15 },
    1000,
    800,
  );
  expect(r).toEqual({ left: 100, top: 80, width: 200, height: 40 });
});

describe("styleFor", () => {
  test("everything is base when nothing is selected", () => {
    expect(styleFor(0, null)).toBe("base");
    expect(styleFor(3, null)).toBe("base");
  });

  test("the selected field is active and the rest are dimmed", () => {
    expect(styleFor(2, 2)).toBe("active");
    expect(styleFor(0, 2)).toBe("dimmed");
  });
});

describe("indexCitations", () => {
  test("keeps the field's own index and drops fields with no citation", () => {
    const indexed = indexCitations([
      { citation: cite(0) },
      { citation: null },
      { citation: cite(1) },
    ]);
    expect(indexed).toEqual([
      { fieldIndex: 0, citation: cite(0) },
      { fieldIndex: 2, citation: cite(1) },
    ]);
  });

  test("returns an empty list when no field has a citation", () => {
    expect(indexCitations([{ citation: null }])).toEqual([]);
  });
});

describe("diffStyles", () => {
  test("reports only the field indexes whose style changed", () => {
    const prev = new Map<number, CitationStyle>([
      [0, "base"],
      [1, "base"],
      [2, "base"],
    ]);
    const next = new Map<number, CitationStyle>([
      [0, "dimmed"],
      [1, "active"],
      [2, "dimmed"],
    ]);
    expect(diffStyles(prev, next).sort()).toEqual([0, 1, 2]);
  });

  test("a second selection only moves two annotations", () => {
    const prev = new Map<number, CitationStyle>([
      [0, "active"],
      [1, "dimmed"],
      [2, "dimmed"],
    ]);
    const next = new Map<number, CitationStyle>([
      [0, "dimmed"],
      [1, "active"],
      [2, "dimmed"],
    ]);
    expect(diffStyles(prev, next).sort()).toEqual([0, 1]);
  });

  test("reports nothing when styles are unchanged", () => {
    const same = new Map<number, CitationStyle>([[0, "base"]]);
    expect(diffStyles(same, new Map(same))).toEqual([]);
  });

  test("treats a newly appearing index as changed", () => {
    expect(
      diffStyles(new Map(), new Map([[7, "base" as CitationStyle]])),
    ).toEqual([7]);
  });
});

describe("CITATION_STYLES", () => {
  test("active is more prominent than base, which is more than dimmed", () => {
    expect(CITATION_STYLES.active.opacity).toBeGreaterThan(
      CITATION_STYLES.base.opacity,
    );
    expect(CITATION_STYLES.base.opacity).toBeGreaterThan(
      CITATION_STYLES.dimmed.opacity,
    );
    expect(CITATION_STYLES.active.strokeWidth).toBeGreaterThan(
      CITATION_STYLES.base.strokeWidth,
    );
  });
});
