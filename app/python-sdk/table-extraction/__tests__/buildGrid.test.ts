import { describe, expect, it } from "vitest";
import { buildGrid, type Cell } from "../buildGrid";

const cell = (
  row: number,
  column: number,
  text: string,
  extra: Partial<Cell> = {},
): Cell => ({
  row,
  column,
  rowSpan: 1,
  colSpan: 1,
  text,
  confidence: 1,
  bounds: null,
  ...extra,
});

describe("buildGrid", () => {
  it("places cells into a rowCount x columnCount matrix by row/column", () => {
    const cells = [
      cell(0, 0, "A"),
      cell(0, 1, "B"),
      cell(1, 0, "C"),
      cell(1, 1, "D"),
    ];
    const grid = buildGrid(cells, 2, 2);
    expect(grid).toHaveLength(2);
    expect(grid[0].map((c) => c?.text)).toEqual(["A", "B"]);
    expect(grid[1].map((c) => c?.text)).toEqual(["C", "D"]);
  });

  it("marks positions covered by a colSpan as null so they are not rendered twice", () => {
    const cells = [
      cell(0, 0, "wide", { colSpan: 2 }),
      cell(1, 0, "x"),
      cell(1, 1, "y"),
    ];
    const grid = buildGrid(cells, 2, 2);
    expect(grid[0][0]?.text).toBe("wide");
    expect(grid[0][1]).toBeNull();
  });

  it("marks positions covered by a rowSpan as null", () => {
    const cells = [
      cell(0, 0, "tall", { rowSpan: 2 }),
      cell(0, 1, "b"),
      cell(1, 1, "d"),
    ];
    const grid = buildGrid(cells, 2, 2);
    expect(grid[0][0]?.text).toBe("tall");
    expect(grid[1][0]).toBeNull();
    expect(grid[1][1]?.text).toBe("d");
  });

  it("tolerates missing cells (ragged tables) by leaving nulls", () => {
    const cells = [cell(0, 0, "only")];
    const grid = buildGrid(cells, 2, 2);
    expect(grid[0][0]?.text).toBe("only");
    expect(grid[0][1]).toBeNull();
    expect(grid[1][0]).toBeNull();
  });

  it("ignores cells with out-of-range coordinates instead of throwing", () => {
    const cells = [cell(0, 0, "ok"), cell(5, 5, "oob")];
    const grid = buildGrid(cells, 1, 1);
    expect(grid[0][0]?.text).toBe("ok");
    expect(grid).toHaveLength(1);
    expect(grid[0]).toHaveLength(1);
  });

  it("drops a covered anchor when a spanning cell overlaps it (spanning cell wins)", () => {
    const cells = [cell(0, 0, "wide", { colSpan: 2 }), cell(0, 1, "covered")];
    const grid = buildGrid(cells, 1, 2);
    expect(grid[0][0]?.text).toBe("wide");
    expect(grid[0][1]).toBeNull(); // the "covered" anchor is dropped
  });

  it("returns an empty array for non-positive dimensions", () => {
    expect(buildGrid([cell(0, 0, "x")], 0, 3)).toEqual([]);
    expect(buildGrid([cell(0, 0, "x")], -1, 2)).toEqual([]);
  });
});
