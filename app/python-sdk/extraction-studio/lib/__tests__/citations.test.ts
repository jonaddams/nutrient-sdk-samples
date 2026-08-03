import { describe, expect, test } from "vitest";
import type { Citation } from "../api";
import {
  appearance,
  CITATION_PRESETS,
  type CitationStyle,
  DEFAULT_CITATION_HEX,
  diffStyles,
  fracToRect,
  hexToRgb,
  indexCitations,
  type PaintedStyle,
  rgbToHex,
  styleFor,
} from "../citations";

// diffStyles now compares PaintedStyle (style key + the colour it was painted
// with), so these helpers keep the existing cases readable.
const HEX = DEFAULT_CITATION_HEX;
const painted = (
  entries: [number, CitationStyle][],
  hex: string = HEX,
): Map<number, PaintedStyle> =>
  new Map(entries.map(([i, style]) => [i, { style, hex }]));

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
    const prev = painted([
      [0, "base"],
      [1, "base"],
      [2, "base"],
    ]);
    const next = painted([
      [0, "dimmed"],
      [1, "active"],
      [2, "dimmed"],
    ]);
    expect(diffStyles(prev, next).sort()).toEqual([0, 1, 2]);
  });

  test("a second selection only moves two annotations", () => {
    const prev = painted([
      [0, "active"],
      [1, "dimmed"],
      [2, "dimmed"],
    ]);
    const next = painted([
      [0, "dimmed"],
      [1, "active"],
      [2, "dimmed"],
    ]);
    expect(diffStyles(prev, next).sort()).toEqual([0, 1]);
  });

  test("reports nothing when styles are unchanged", () => {
    const same = painted([[0, "base"]]);
    expect(diffStyles(same, new Map(same))).toEqual([]);
  });

  test("treats a newly appearing index as changed", () => {
    expect(diffStyles(new Map(), painted([[7, "base"]]))).toEqual([7]);
  });
});

describe("appearance", () => {
  test("active is more prominent than base, which is more than dimmed", () => {
    const a = appearance("active", HEX);
    const b = appearance("base", HEX);
    const d = appearance("dimmed", HEX);
    expect(a.opacity).toBeGreaterThan(b.opacity);
    expect(b.opacity).toBeGreaterThan(d.opacity);
    expect(a.strokeWidth).toBeGreaterThan(b.strokeWidth);
  });

  test("every style stays translucent so the marked text is still readable", () => {
    for (const style of ["base", "dimmed", "active"] as CitationStyle[]) {
      expect(appearance(style, HEX).opacity).toBeLessThan(1);
    }
  });

  test("dimmed is visible, not effectively invisible", () => {
    // It was 0.07, which made every unselected citation vanish the moment one
    // was picked. That is the bug this floor guards against.
    expect(appearance("dimmed", HEX).opacity).toBeGreaterThanOrEqual(0.12);
  });

  test("fill follows the requested colour and stroke is darker", () => {
    const { fill, stroke } = appearance("base", "#00a3e0");
    expect(fill).toEqual({ r: 0, g: 163, b: 224 });
    expect(stroke.g).toBeLessThan(fill.g);
    expect(stroke.b).toBeLessThan(fill.b);
  });

  test("falls back to the default rather than throwing on a bad colour", () => {
    expect(appearance("base", "nonsense")).toEqual(appearance("base", HEX));
  });
});

describe("hex parsing", () => {
  test("accepts 6-digit, 3-digit, and bare forms", () => {
    expect(hexToRgb("#ffc107")).toEqual({ r: 255, g: 193, b: 7 });
    expect(hexToRgb("ffc107")).toEqual({ r: 255, g: 193, b: 7 });
    expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
  });

  test("rejects partial input instead of guessing", () => {
    // The picker commits only valid values, so half-typed input must not parse.
    for (const bad of ["", "#", "#f", "#ff", "#fffff", "#gggggg", "red"]) {
      expect(hexToRgb(bad)).toBeNull();
    }
  });

  test("round-trips through rgbToHex", () => {
    for (const p of CITATION_PRESETS) {
      const rgb = hexToRgb(p.hex);
      expect(rgb).not.toBeNull();
      if (rgb) expect(rgbToHex(rgb)).toBe(p.hex);
    }
  });
});

describe("CITATION_PRESETS", () => {
  test("all presets are valid hex and ids are unique", () => {
    expect(CITATION_PRESETS.length).toBeGreaterThanOrEqual(3);
    for (const p of CITATION_PRESETS) expect(hexToRgb(p.hex)).not.toBeNull();
    expect(new Set(CITATION_PRESETS.map((p) => p.id)).size).toBe(
      CITATION_PRESETS.length,
    );
  });

  test("the default is one of the presets", () => {
    expect(CITATION_PRESETS.map((p) => p.hex)).toContain(DEFAULT_CITATION_HEX);
  });
});

describe("diffStyles sees a colour change", () => {
  test("same style keys but a new colour repaints everything", () => {
    // The whole point of PaintedStyle. Without the colour in the map this
    // returns [] and the picker silently does nothing.
    const prev = painted(
      [
        [0, "base"],
        [1, "dimmed"],
      ],
      "#ffc107",
    );
    const next = painted(
      [
        [0, "base"],
        [1, "dimmed"],
      ],
      "#00a3e0",
    );
    expect(diffStyles(prev, next).sort()).toEqual([0, 1]);
  });

  test("identical style and colour still reports nothing", () => {
    const prev = painted([[0, "base"]], "#ffc107");
    const next = painted([[0, "base"]], "#ffc107");
    expect(diffStyles(prev, next)).toEqual([]);
  });
});
