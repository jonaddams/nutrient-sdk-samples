import { describe, expect, it } from "vitest";
import { confidenceHex } from "../ocr";
import {
  buildGrid,
  type ExtractedTable,
  type TableCell,
  tableCitationsFor,
  tablesToCsv,
} from "../tables";
import multi from "./fixtures/tables-multi.json";

const cell = (over: Partial<TableCell> = {}): TableCell => ({
  row: 0,
  column: 0,
  rowSpan: 1,
  colSpan: 1,
  text: "",
  confidence: 1,
  bounds: null,
  ...over,
});

describe("buildGrid", () => {
  it("places each anchor cell at its row and column", () => {
    const grid = buildGrid(
      [
        cell({ row: 0, column: 0, text: "A" }),
        cell({ row: 1, column: 1, text: "D" }),
      ],
      2,
      2,
    );
    expect(grid[0][0]?.text).toBe("A");
    expect(grid[1][1]?.text).toBe("D");
    expect(grid[0][1]).toBeNull();
  });

  it("nulls the positions a span covers, leaving only the anchor", () => {
    const grid = buildGrid(
      [
        cell({ row: 0, column: 0, text: "wide", colSpan: 2 }),
        cell({ row: 0, column: 1, text: "covered" }),
      ],
      1,
      2,
    );
    expect(grid[0][0]?.text).toBe("wide");
    expect(grid[0][1]).toBeNull();
  });

  it("nulls positions covered by a row span", () => {
    const grid = buildGrid(
      [
        cell({ row: 0, column: 0, text: "tall", rowSpan: 2 }),
        cell({ row: 1, column: 0, text: "covered" }),
      ],
      2,
      1,
    );
    expect(grid[0][0]?.text).toBe("tall");
    expect(grid[1][0]).toBeNull();
  });

  it("ignores out-of-range cells rather than throwing", () => {
    expect(() =>
      buildGrid([cell({ row: 99, column: 99, text: "nope" })], 2, 2),
    ).not.toThrow();
    const grid = buildGrid([cell({ row: 99, column: 99 })], 2, 2);
    expect(grid.flat().every((c) => c === null)).toBe(true);
  });

  it("returns an empty grid for a zero-dimension table", () => {
    expect(buildGrid([cell()], 0, 3)).toEqual([]);
    expect(buildGrid([cell()], 3, 0)).toEqual([]);
  });

  it("treats a zero or missing span as 1", () => {
    const grid = buildGrid([cell({ text: "x", colSpan: 0, rowSpan: 0 })], 1, 1);
    expect(grid[0][0]?.text).toBe("x");
  });

  it("reconstructs every table in the captured response without throwing", () => {
    // The fixture is a real backend response, so this is the shape assertion
    // that matters: a type is a claim about the backend, not a check on it.
    expect(multi.tables.length).toBeGreaterThan(0);
    for (const table of multi.tables) {
      const grid = buildGrid(
        table.cells as TableCell[],
        table.rowCount,
        table.columnCount,
      );
      expect(grid).toHaveLength(table.rowCount);
      for (const row of grid) expect(row).toHaveLength(table.columnCount);
    }
  });
});

describe("tablesToCsv", () => {
  it("renders a table as rows of comma-separated cells", () => {
    const csv = tablesToCsv([
      {
        rowCount: 2,
        columnCount: 2,
        cells: [
          cell({ row: 0, column: 0, text: "Item" }),
          cell({ row: 0, column: 1, text: "Qty" }),
          cell({ row: 1, column: 0, text: "Concrete" }),
          cell({ row: 1, column: 1, text: "120" }),
        ],
      },
    ]);
    expect(csv).toBe("Item,Qty\nConcrete,120\n");
  });

  it("quotes a field containing a comma", () => {
    const csv = tablesToCsv([
      { rowCount: 1, columnCount: 1, cells: [cell({ text: "Smith, John" })] },
    ]);
    expect(csv).toBe('"Smith, John"\n');
  });

  it("quotes and doubles an embedded double quote", () => {
    const csv = tablesToCsv([
      { rowCount: 1, columnCount: 1, cells: [cell({ text: 'say "hi"' })] },
    ]);
    expect(csv).toBe('"say ""hi"""\n');
  });

  it("quotes a field containing a newline", () => {
    const csv = tablesToCsv([
      { rowCount: 1, columnCount: 1, cells: [cell({ text: "line1\nline2" })] },
    ]);
    expect(csv).toBe('"line1\nline2"\n');
  });

  it("leaves span-covered positions empty so columns stay aligned", () => {
    // The header spans both columns; the second column of row 0 must be an
    // empty field, not a repeat of the anchor's text.
    const csv = tablesToCsv([
      {
        rowCount: 2,
        columnCount: 2,
        cells: [
          cell({ row: 0, column: 0, text: "Totals", colSpan: 2 }),
          cell({ row: 1, column: 0, text: "A" }),
          cell({ row: 1, column: 1, text: "B" }),
        ],
      },
    ]);
    expect(csv).toBe("Totals,\nA,B\n");
  });

  it("separates multiple tables with a blank line", () => {
    const csv = tablesToCsv([
      { rowCount: 1, columnCount: 1, cells: [cell({ text: "one" })] },
      { rowCount: 1, columnCount: 1, cells: [cell({ text: "two" })] },
    ]);
    expect(csv).toBe("one\n\ntwo\n");
  });

  it("returns an empty string for no tables", () => {
    expect(tablesToCsv([])).toBe("");
  });

  it("gives every row of a real table the same number of fields", () => {
    // NOTE: the brief's version of this test split the whole CSV block on
    // "\n" and re-derived quote state from scratch on each resulting line.
    // That is wrong for any quoted field that itself contains a literal
    // newline (exercised by the "quotes a field containing a newline" test
    // above): the embedded "\n" fractures one logical CSV row into two
    // fake "lines", each starting from inQuotes = false, so a row that
    // legitimately spans two text lines gets scored as two separate rows
    // with wrong field counts. It doesn't fail against this fixture only
    // because no cell in it happens to contain a newline — a fixture that
    // did would make it fail for the wrong reason (row fracturing), not
    // catch a real alignment bug. Rewritten to split into logical rows by
    // tracking quote state across the whole block, so a newline inside an
    // open quote does not end a row.
    for (const table of multi.tables as ExtractedTable[]) {
      const block = tablesToCsv([table]);
      if (!block) continue;

      const rows: string[][] = [[]];
      let field = "";
      let inQuotes = false;
      const text = block.trimEnd();
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
          if (ch === '"' && text[i + 1] === '"') {
            field += '"';
            i++;
          } else if (ch === '"') {
            inQuotes = false;
          } else {
            field += ch;
          }
        } else if (ch === '"') {
          inQuotes = true;
        } else if (ch === ",") {
          rows[rows.length - 1].push(field);
          field = "";
        } else if (ch === "\n") {
          rows[rows.length - 1].push(field);
          field = "";
          rows.push([]);
        } else {
          field += ch;
        }
      }
      rows[rows.length - 1].push(field);

      const counts = new Set(rows.map((r) => r.length));
      expect(counts.size).toBe(1);
      expect([...counts][0]).toBe(table.columnCount);
    }
  });
});

describe("tableCitationsFor", () => {
  // `citation` is what the backend sends and what the overlay draws: fractional
  // 0..1, 0-based page. `bounds` stays absolute raster pixels and is not used
  // here — see the invariants above.
  const cit = (x0: number, page = 0) => ({
    page,
    x0,
    y0: 0.2,
    x1: x0 + 0.3,
    y1: 0.25,
  });

  const twoCells: ExtractedTable[] = [
    {
      page: 0,
      rowCount: 1,
      columnCount: 2,
      cells: [
        cell({ column: 0, text: "low", confidence: 0.2, citation: cit(0.1) }),
        cell({ column: 1, text: "high", confidence: 0.95, citation: cit(0.5) }),
      ],
    },
  ];

  it("omits hex entirely in custom mode, so resolveHex falls through", () => {
    // The mechanism the whole overlay rests on: resolveHex is
    // `citation.hex ?? fallback`, so the key must be ABSENT, not undefined.
    const out = tableCitationsFor(twoCells, "custom");
    expect(out).toHaveLength(2);
    for (const c of out) expect("hex" in c).toBe(false);
  });

  it("tints each cell by its own confidence in confidence mode", () => {
    const out = tableCitationsFor(twoCells, "confidence");
    expect(out[0].hex).toBe(confidenceHex(0.2));
    expect(out[1].hex).toBe(confidenceHex(0.95));
    expect(out[0].hex).not.toBe(out[1].hex);
  });

  it("returns IndexedCitation wrappers, not flattened citations", () => {
    const out = tableCitationsFor(twoCells, "custom");
    expect(out[0]).toHaveProperty("fieldIndex");
    expect(out[0]).toHaveProperty("citation");
    expect(out[0].citation).toMatchObject({ x0: 0.1, y0: 0.2 });
    // A flattened shape would put x0 on the wrapper and paint nothing.
    expect(out[0]).not.toHaveProperty("x0");
  });

  it("keeps every coordinate fractional", () => {
    // The guard against the units bug: absolute raster pixels here would
    // collapse every box into the page's top-left corner.
    for (const c of tableCitationsFor(twoCells, "confidence")) {
      for (const v of [
        c.citation.x0,
        c.citation.y0,
        c.citation.x1,
        c.citation.y1,
      ]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  it("skips cells with no citation, and fieldIndex stays the index into the FULL cell list", () => {
    // The array is COMPACTED, so position is not fieldIndex — the misalignment
    // bug fixed in 77fa9c1. A cell whose bounds the backend could not normalise
    // has citation null and must still consume an index.
    const withGap: ExtractedTable[] = [
      {
        page: 0,
        rowCount: 1,
        columnCount: 3,
        cells: [
          cell({ column: 0, citation: null }),
          cell({ column: 1, citation: cit(0.1) }),
          cell({ column: 2, citation: cit(0.3) }),
        ],
      },
    ];
    const out = tableCitationsFor(withGap, "custom");
    expect(out).toHaveLength(2);
    expect(out[0].fieldIndex).toBe(1);
    expect(out[1].fieldIndex).toBe(2);
  });

  it("treats a cell with no citation key at all the same as a null one", () => {
    // A backend predating the citation field omits the key entirely.
    const older: ExtractedTable[] = [
      { page: 0, rowCount: 1, columnCount: 1, cells: [cell({ column: 0 })] },
    ];
    expect(tableCitationsFor(older, "custom")).toEqual([]);
  });

  it("numbers cells continuously across tables and keeps each on its own page", () => {
    // The page comes from the backend's citation, already 0-based. A single
    // hardcoded page would put every table's boxes on the first page — wrong
    // for the flagship multi-page demo document.
    const spread: ExtractedTable[] = [
      {
        page: 0,
        rowCount: 1,
        columnCount: 1,
        cells: [cell({ citation: cit(0.1, 0) })],
      },
      {
        page: 3,
        rowCount: 1,
        columnCount: 1,
        cells: [cell({ citation: cit(0.1, 3) })],
      },
    ];
    const out = tableCitationsFor(spread, "custom");
    expect(out.map((c) => c.fieldIndex)).toEqual([0, 1]);
    expect(out.map((c) => c.citation.page)).toEqual([0, 3]);
  });

  it("passes the backend's citation through untouched", () => {
    // No arithmetic here: the backend already normalised these with the same
    // geometry.normalize_bbox the structured and OCR paths use. Dividing by a
    // page width in the frontend would double-convert.
    const c = cit(0.1);
    const one: ExtractedTable[] = [
      { page: 0, rowCount: 1, columnCount: 1, cells: [cell({ citation: c })] },
    ];
    expect(tableCitationsFor(one, "custom")[0].citation).toEqual(c);
  });

  it("returns nothing for no tables", () => {
    expect(tableCitationsFor([], "confidence")).toEqual([]);
  });
});
