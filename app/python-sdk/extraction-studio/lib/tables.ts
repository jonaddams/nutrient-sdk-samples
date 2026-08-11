import type { Citation } from "./api";
import { API_BASE } from "./api";
import type { IndexedCitation } from "./citations";
import { confidenceHex } from "./ocr";

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
 * This is now the sole home for this logic. It started as a copy of the
 * equivalent helper in the standalone tables sample that predated this
 * studio, kept separate rather than imported so that sample could be deleted
 * without touching the studio — which is exactly what happened once the
 * studio's Tables rail feature superseded it: the sample was deleted
 * outright, and this copy stayed behind as the only implementation.
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

/** Quote per RFC 4180: a field containing a comma, a double quote or a newline
 *  is wrapped in quotes, and embedded quotes are doubled. */
function csvField(text: string): string {
  if (!/[",\n\r]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Every table as CSV, separated by a blank line.
 *
 *  Renders the RECONSTRUCTED GRID, not the flat cell list, so a spanning cell
 *  leaves its covered positions empty and the columns of later rows still line
 *  up. Emitting the flat list in cell order silently shifts every row that
 *  contains a span.
 *
 *  Blank-line separation rather than a "# Table 2" comment: spreadsheet
 *  importers tolerate the blank line and would treat the comment as data. */
export function tablesToCsv(tables: ExtractedTable[]): string {
  return tables
    .map((table) =>
      buildGrid(table.cells, table.rowCount, table.columnCount)
        .map((row) => row.map((c) => csvField(c?.text ?? "")).join(","))
        .join("\n"),
    )
    .filter((block) => block.length > 0)
    .map((block) => `${block}\n`)
    .join("\n");
}

/** Which colour the table overlay paints its cell boxes. Mirrors OcrColorMode;
 *  kept separate so the two features' modes can diverge without one silently
 *  retyping the other. */
export type TableColorMode = "confidence" | "custom";

/** A flat index over every cell of every table, in table then cell order.
 *  This is the `fieldIndex` space — a click on a box maps back through it. */
export function flattenCells(tables: ExtractedTable[]): TableCell[] {
  return tables.flatMap((t) => t.cells);
}

/** Build the document overlay's boxes for one table run.
 *
 *  `fieldIndex` is the index into the FULL flattened cell list, not into the
 *  array returned here: cells without bounds are dropped, so the result is
 *  COMPACTED and its array position is not the cell a click should select.
 *  That is the misalignment bug fixed in 77fa9c1.
 *
 *  In `custom` mode each entry omits `hex` ENTIRELY rather than setting it to
 *  undefined, so resolveHex (`citation.hex ?? fallback`) falls through to the
 *  studio-wide picker value — the same path structured extraction and OCR both
 *  take. Setting `hex: undefined` would satisfy the type and break the
 *  fall-through, because `??` tests for null/undefined on a key that is
 *  PRESENT. That is why the test asserts `"hex" in c === false`.
 *
 *  NO COORDINATE ARITHMETIC. `cell.citation` arrives fractional with a 0-based
 *  page, converted server-side by geometry.normalize_bbox — the same function
 *  the structured and OCR paths use, called where the page's raster dimensions
 *  actually live. The raw `bounds` on the same cell are ABSOLUTE raster pixels
 *  (measured up to 4345x5542) and must never reach the overlay: they would
 *  collapse every box into the page's top-left corner. Dividing here instead
 *  would double-convert. */
export function tableCitationsFor(
  tables: ExtractedTable[],
  mode: TableColorMode,
): IndexedCitation[] {
  return flattenCells(tables).flatMap((c, index) =>
    c.citation
      ? [
          {
            fieldIndex: index,
            citation: c.citation,
            ...(mode === "confidence"
              ? { hex: confidenceHex(c.confidence) }
              : {}),
          },
        ]
      : [],
  );
}

export type TablesRequest = {
  /** Public URL of the PDF, e.g. "/documents/lumen-invoice.pdf". Fetched here
   *  and posted as multipart, because the backend holds no document registry. */
  docPath: string;
  filename: string;
  /** "claude" | "openai" — this endpoint's vocabulary, NOT the studio's. The
   *  caller maps "anthropic" to "claude" before getting here. */
  provider: string;
};

export async function extractTables(req: TablesRequest): Promise<TablesResult> {
  const fileResp = await fetch(req.docPath);
  if (!fileResp.ok) {
    throw new Error(`could not load ${req.docPath}: ${fileResp.status}`);
  }
  const blob = await fileResp.blob();

  const form = new FormData();
  form.append("file", new File([blob], req.filename));

  const params = new URLSearchParams({ provider: req.provider });

  // No content-type header — the browser must set the multipart boundary.
  const resp = await fetch(`${API_BASE}/api/extraction/tables?${params}`, {
    method: "POST",
    body: form,
  });
  if (!resp.ok) {
    // FastAPI reports failures as {"detail": "..."}. A 503 here means the
    // local VLM is unreachable, which is only diagnosable from that message.
    const detail = await resp
      .json()
      .then((b) => (typeof b?.detail === "string" ? b.detail : null))
      .catch(() => null);
    throw new Error(detail ?? `table extraction failed: ${resp.status}`);
  }
  return (await resp.json()) as TablesResult;
}
