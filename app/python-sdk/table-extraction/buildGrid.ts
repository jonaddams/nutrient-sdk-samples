export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Cell {
  row: number;
  column: number;
  rowSpan: number;
  colSpan: number;
  text: string;
  confidence: number;
  bounds: Bounds | null;
}

export interface TableResult {
  rowCount: number;
  columnCount: number;
  cells: Cell[];
}

/**
 * Reconstruct a 2D grid (rowCount x columnCount) from a flat cell list.
 * Each anchor cell is placed at [row][column]; positions covered by its
 * row/col span are set to null so the renderer skips them. Out-of-range
 * cells are ignored rather than throwing.
 */
export function buildGrid(
  cells: Cell[],
  rowCount: number,
  columnCount: number,
): (Cell | null)[][] {
  if (rowCount <= 0 || columnCount <= 0) return [];

  const grid: (Cell | null)[][] = Array.from({ length: rowCount }, () =>
    Array.from({ length: columnCount }, () => null as Cell | null),
  );

  for (const c of cells) {
    if (
      c.row < 0 ||
      c.row >= rowCount ||
      c.column < 0 ||
      c.column >= columnCount
    ) {
      continue;
    }
    grid[c.row][c.column] = c;
  }

  // Null out positions covered by a span, leaving only the anchor cell.
  // If two anchor cells overlap, the spanning cell wins and the covered
  // anchor is dropped (acceptable for well-formed SDK output).
  for (const c of cells) {
    if (
      c.row < 0 ||
      c.row >= rowCount ||
      c.column < 0 ||
      c.column >= columnCount
    ) {
      continue;
    }
    const rs = Math.max(1, c.rowSpan || 1);
    const cs = Math.max(1, c.colSpan || 1);
    for (let r = c.row; r < c.row + rs && r < rowCount; r++) {
      for (
        let col = c.column;
        col < c.column + cs && col < columnCount;
        col++
      ) {
        if (r === c.row && col === c.column) continue;
        grid[r][col] = null;
      }
    }
  }

  return grid;
}
