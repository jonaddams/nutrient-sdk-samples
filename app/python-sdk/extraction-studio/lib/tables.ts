import type { Citation } from "./api";

/**
 * Table Extraction — /api/extraction/tables.
 *
 * The endpoint takes a file and a provider, and nothing else. There is no
 * options object to build, which is why this feature's config panel is a
 * provider select and a Run button: the alternative is inventing a control
 * that changes nothing, which is the mistake that retired the Multimodal
 * toggle.
 *
 * NOTE the provider vocabulary differs from /structured. This endpoint accepts
 * only "claude" | "openai" and runs the VlmProvider.CLAUDE + Claude-settings
 * path; /structured takes the flat ai.provider path and accepts openai,
 * anthropic, bedrock and local. One file's pattern does not imply the other's.
 */

export type TableBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TableCell = {
  row: number;
  column: number;
  rowSpan: number;
  colSpan: number;
  text: string;
  confidence: number;
  /** ABSOLUTE raster pixels, origin top-left — measured 2026-08-11, up to
   *  4345x5542 on a real document. Kept for reference only. **Do NOT feed these
   *  to the overlay**: it consumes fractional 0..1 coordinates, so raw bounds
   *  collapse every box into the page's top-left corner. Use `citation`. */
  bounds: TableBounds | null;
  /** Fractional 0..1 with a 0-based page — the same shape /structured and /ocr
   *  return, converted server-side by geometry.normalize_bbox where the page's
   *  raster dimensions live. This is what the overlay draws.
   *
   *  Null when the cell had no bounds, or when the page reported no dimensions
   *  (an honest null beats a guessed scale). Optional on the TYPE because a
   *  backend predating this field omits it — this type is a claim about the
   *  backend, not a check on it. */
  citation?: Citation | null;
};

export type ExtractedTable = {
  /** 0-based, matching the viewer and `citation.page`. Null when the element
   *  carried no page number. */
  page?: number | null;
  rowCount: number;
  columnCount: number;
  cells: TableCell[];
};

export type TablesResult = {
  engine: string;
  filename: string;
  provider: string;
  tableCount: number;
  tables: ExtractedTable[];
  rawElements: unknown[];
  /** Per-page raster dimensions. Present so a consumer could place boxes
   *  itself; this panel does not need to, because the backend already emits a
   *  fractional `citation` per cell. */
  pages?: { page: number; width: number; height: number }[];
  totalPages: number;
  processedPages: number;
  /** Built by the backend. Optional deliberately, matching OcrResult: this type
   *  is a claim about the backend's shape, not a check on it, so the frontend
   *  can deploy before the backend does. */
  code?: string;
  timingMs?: number;
};

/**
 * Reconstruct a 2D grid (rowCount x columnCount) from a flat cell list.
 * Each anchor cell is placed at [row][column]; positions covered by its
 * row/col span are set to null so the renderer skips them. Out-of-range
 * cells are ignored rather than throwing.
 *
 * Copied from app/python-sdk/table-extraction/buildGrid.ts rather than
 * imported. That sample stays listed until it is retired, and coupling a
 * sample we intend to delete to the studio's lib is worse than a bounded
 * duplicate that leaves with it.
 */
export function buildGrid(
  cells: TableCell[],
  rowCount: number,
  columnCount: number,
): (TableCell | null)[][] {
  if (rowCount <= 0 || columnCount <= 0) return [];

  const grid: (TableCell | null)[][] = Array.from({ length: rowCount }, () =>
    Array.from({ length: columnCount }, () => null as TableCell | null),
  );

  const inRange = (c: TableCell) =>
    c.row >= 0 && c.row < rowCount && c.column >= 0 && c.column < columnCount;

  for (const c of cells) {
    if (inRange(c)) grid[c.row][c.column] = c;
  }

  // Null out positions covered by a span, leaving only the anchor cell.
  // If two anchor cells overlap, the spanning cell wins and the covered
  // anchor is dropped (acceptable for well-formed SDK output).
  for (const c of cells) {
    if (!inRange(c)) continue;
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
