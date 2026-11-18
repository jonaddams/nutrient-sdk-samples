import { describe, expect, test } from "vitest";
import {
  CHUNK_BUDGET,
  matchRows,
  naiveChunks,
  type ParseElement,
  parsedChunks,
} from "./chunk";

// A scanned page in raster px (1653x2339), the units DWS returns for OCR'd
// pages: the footer comes FIRST in reading order, right before the table.
const page = { pageIndex: 11, width: 1653, height: 2339 };
const el = (
  o: Partial<ParseElement> & Pick<ParseElement, "readingOrder" | "bounds">,
): ParseElement => ({
  type: "paragraph",
  page,
  ...o,
});
const SCAN: ParseElement[] = [
  el({
    readingOrder: 0,
    role: "SectionHeader",
    text: "E. Chargeback on Surrenders",
    bounds: { x: 240, y: 700, width: 800, height: 30 },
  }),
  el({
    readingOrder: 1,
    text: "The charge back rates are:",
    bounds: { x: 240, y: 800, width: 400, height: 20 },
  }),
  el({
    readingOrder: 2,
    role: "Footer",
    text: "Page 12 Broker Dealer",
    bounds: { x: 1300, y: 2200, width: 200, height: 40 },
  }),
  el({
    readingOrder: 3,
    type: "table",
    bounds: { x: 240, y: 844, width: 850, height: 244 },
    cells: [
      { row: 0, column: 0, text: "Completed Months" },
      { row: 0, column: 1, text: "Percentage" },
      { row: 1, column: 0, text: "4" },
      { row: 1, column: 1, text: "90" },
    ],
  }),
];

describe("parsedChunks", () => {
  const chunks = parsedChunks("principal", SCAN);
  const table = chunks.find((c) => c.text.includes("| 4 | 90 |"));

  test("keeps a table whole as Markdown rows", () => {
    expect(table?.text).toContain("| Completed Months | Percentage |");
  });

  test("captions a table with the section and paragraph ABOVE it, not the footer", () => {
    expect(table?.text).toContain("E. Chargeback on Surrenders");
    expect(table?.text).toContain("The charge back rates are:");
    expect(chunks.some((c) => c.text.includes("Page 12 Broker Dealer"))).toBe(
      false,
    );
  });

  test("normalizes boxes by the element's own page size", () => {
    const [box] = table?.boxes ?? [];
    expect(box.page).toBe(11);
    expect(box.x).toBeCloseTo(240 / 1653);
    expect(box.y).toBeCloseTo(844 / 2339);
    expect(box.w).toBeCloseTo(850 / 1653);
  });

  test("never splits a paragraph across chunks", () => {
    const long = "x".repeat(CHUNK_BUDGET - 100);
    const els = [0, 1].map((i) =>
      el({
        readingOrder: i,
        text: `${i}${long}`,
        bounds: { x: 0, y: i * 50, width: 10, height: 10 },
      }),
    );
    const out = parsedChunks("d", els);
    expect(out).toHaveLength(2);
    expect(out.map((c) => c.text[0])).toEqual(["0", "1"]);
  });
});

describe("matchRows", () => {
  const box = (y: number) => ({ page: 18, x: 0, y, w: 1, h: 0.01 });
  const rows = [
    {
      cells: [
        "CN",
        "Granted",
        "201380018751",
        "10-Apr-13",
        "2512525",
        "9-Jun-17",
      ],
      box: box(0.1),
    },
    {
      cells: [
        "CN",
        "Granted",
        "201380018754",
        "10-Apr-13",
        "104245258",
        "3-May-17",
      ],
      box: box(0.2),
    },
  ];

  test("picks the row the answer quotes, not a row sharing one value", () => {
    const answer =
      "Chinese patent 104245258 (filed 10-Apr-13) has an issue date of 3-May-17.";
    expect(matchRows(rows, answer)).toEqual([box(0.2)]);
  });

  test("returns nothing below two matching cells, so the caller shows the whole table", () => {
    expect(matchRows(rows, "Both were filed 10-Apr-13.")).toEqual([]);
  });
});

describe("naiveChunks", () => {
  test("cuts fixed windows regardless of sentence boundaries", () => {
    const out = naiveChunks("d", ["a".repeat(CHUNK_BUDGET + 500), ""]);
    expect(out.map((c) => c.text.length)).toEqual([CHUNK_BUDGET, 500]);
    expect(out.every((c) => c.page === 0 && !c.boxes)).toBe(true);
  });
});
