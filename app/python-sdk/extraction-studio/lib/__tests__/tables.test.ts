import { describe, expect, it } from "vitest";
import { buildGrid, type TableCell } from "../tables";
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
