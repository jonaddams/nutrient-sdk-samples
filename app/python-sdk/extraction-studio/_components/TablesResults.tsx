"use client";
import { type KeyboardEvent, useRef, useState } from "react";
import { copyText, downloadText } from "../lib/download";
import { confidenceTone } from "../lib/ocr";
import {
  buildGrid,
  type TableCell,
  type TableColorMode,
  type TablesResult,
  tablesToCsv,
} from "../lib/tables";
import { HighlightColor } from "./HighlightColor";
import { Segmented } from "./Segmented";
import { Toggle } from "./Toggle";

// Shared between the visible eyebrow and the `label` passed to HighlightColor,
// which also feeds that component's aria-labels via `label.toLowerCase()`.
// Hoisted for the same reason OcrResults hoists it: two literals are free to
// drift and no test catches it.
const REGION_COLOR = "Region color";

type TablesView = "table" | "csv" | "json" | "code";

const FILE_FOR_VIEW: Record<TablesView, { type: string; name: string }> = {
  table: { type: "application/json", name: "tables.json" },
  csv: { type: "text/csv", name: "tables.csv" },
  json: { type: "application/json", name: "tables.json" },
  code: { type: "text/x-python", name: "tables.py" },
};

/** A position in ONE table's reconstructed grid — the roving-tabindex focus
 *  position, entirely separate from `activeIndex` on the component below.
 *  `activeIndex` is the SELECTED cell: global across every table, and it
 *  drives which box the document overlay emphasises. This is only which
 *  cell in THIS table currently owns tabIndex=0. Arrow keys move this and
 *  must never select; only Enter/Space/click ever calls onSelectCell. */
type RovingPos = { row: number; col: number };

/** The grid's first real (non-null) position, in row-major order. Used as
 *  a table's roving default before any arrow key has touched it, so every
 *  table already has exactly one tab stop — round 2's whole point — without
 *  needing to seed state for tables nobody has navigated into yet. */
function firstCell(grid: (TableCell | null)[][]): RovingPos {
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col]) return { row, col };
    }
  }
  return { row: 0, col: 0 };
}

/** Round 3's fix: `rovingByTable` persists across runs (this panel is never
 *  remounted — page.tsx renders it with no `key`, same as OcrResults), so a
 *  position arrow-keyed into a big table can point at nothing once `result`
 *  is replaced by a smaller or differently-shaped one. Resolving the roving
 *  position through this function at RENDER TIME, rather than an effect that
 *  resets state when `result` changes, means a stale `{row, col}` simply
 *  cannot survive being read — every render re-validates it against the grid
 *  actually on screen and falls back to `firstCell` the instant it does not
 *  correspond to a real cell. No extra state, nothing to keep in sync, and a
 *  stored position can never be un-representable rather than merely "usually
 *  fixed". Kept AS-IS when still valid, so an arrow-keyed position survives
 *  an unrelated re-render (e.g. toggling Show regions). */
function resolveRoving(
  grid: (TableCell | null)[][],
  stored: RovingPos | undefined,
): RovingPos {
  if (stored && grid[stored.row]?.[stored.col]) return stored;
  return firstCell(grid);
}

/** Associates every table with the same visually-hidden instruction via
 *  `aria-describedby`. One shared id, not one per table: the hint text is
 *  identical for all of them, and aria-describedby resolves an id reference
 *  at read time regardless of how many elements point at it. */
const TABLE_NAV_HINT_ID = "tables-nav-hint";

/** Moves one row/column at a time in the given direction, skipping positions
 *  buildGrid left null (covered by a neighbour's rowSpan/colSpan — nothing is
 *  rendered there, so a naive +1 could land the roving position on nothing).
 *  CLAMPS at the grid's edge: if stepping runs off the grid before finding
 *  another real cell, `pos` is returned unchanged rather than wrapping to the
 *  far side or leaving the table — arrow keys move within one table only. */
function step(
  grid: (TableCell | null)[][],
  pos: RovingPos,
  dRow: number,
  dCol: number,
): RovingPos {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  let { row, col } = pos;
  while (true) {
    row += dRow;
    col += dCol;
    if (row < 0 || row >= rows || col < 0 || col >= cols) return pos;
    if (grid[row][col]) return { row, col };
  }
}

/** Home/End: the first or last real cell in the CURRENT row. Cheap enough —
 *  one linear scan of a row that is at most a few dozen cells wide — that
 *  there was no reason to skip it. */
function rowEdge(
  grid: (TableCell | null)[][],
  pos: RovingPos,
  dir: 1 | -1,
): RovingPos {
  const cols = grid[0]?.length ?? 0;
  const { row } = pos;
  if (dir === 1) {
    for (let col = cols - 1; col >= 0; col--) {
      if (grid[row][col]) return { row, col };
    }
  } else {
    for (let col = 0; col < cols; col++) {
      if (grid[row][col]) return { row, col };
    }
  }
  return pos;
}

export function TablesResults({
  result,
  activeIndex,
  onSelectCell,
  showRegions,
  onShowRegionsChange,
  colorMode,
  onColorModeChange,
  citationHex,
  onCitationHexChange,
}: {
  result: TablesResult;
  activeIndex: number | null;
  onSelectCell: (index: number) => void;
  showRegions: boolean;
  onShowRegionsChange: (value: boolean) => void;
  colorMode: TableColorMode;
  onColorModeChange: (mode: TableColorMode) => void;
  citationHex: string;
  onCitationHexChange: (hex: string) => void;
}) {
  const [view, setView] = useState<TablesView>("table");

  // Roving tabindex: exactly one entry per table that has been arrow-keyed
  // into, keyed by tableIndex. A table with no entry yet still renders with
  // exactly one tab stop, via `resolveRoving`'s fallback below — no need to
  // seed every table's position up front. This state deliberately survives
  // a new `result` (this panel is never remounted between runs), which is
  // exactly why `resolveRoving` re-validates it against the CURRENT grid on
  // every render instead of trusting it — see that function's comment.
  const [rovingByTable, setRovingByTable] = useState<Record<number, RovingPos>>(
    {},
  );
  // Every cell button registers itself here regardless of its tabIndex, so
  // arrow navigation can imperatively .focus() the target: moving tabIndex
  // alone (a plain state + re-render) does not move DOM focus, and a
  // tabIndex=-1 element is still a valid target for an explicit .focus()
  // call — only sequential Tab navigation skips it.
  const buttonRefs = useRef(new Map<string, HTMLButtonElement>());
  const refKey = (t: number, r: number, c: number) => `${t}:${r}:${c}`;

  const focusCell = (tableIndex: number, next: RovingPos) => {
    setRovingByTable((prev) => ({ ...prev, [tableIndex]: next }));
    buttonRefs.current.get(refKey(tableIndex, next.row, next.col))?.focus();
  };

  const handleCellKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    tableIndex: number,
    grid: (TableCell | null)[][],
    pos: RovingPos,
  ) => {
    let next: RovingPos;
    switch (e.key) {
      case "ArrowRight":
        next = step(grid, pos, 0, 1);
        break;
      case "ArrowLeft":
        next = step(grid, pos, 0, -1);
        break;
      case "ArrowDown":
        next = step(grid, pos, 1, 0);
        break;
      case "ArrowUp":
        next = step(grid, pos, -1, 0);
        break;
      case "Home":
        next = rowEdge(grid, pos, -1);
        break;
      case "End":
        next = rowEdge(grid, pos, 1);
        break;
      default:
        // Anything else (Tab included) is left to the browser's own default
        // handling — Tab must still leave the table via the native tab order.
        return;
    }
    // Suppresses the browser's unrelated default for these keys (page
    // scroll on Up/Down/Home/End) — including the no-op clamp case below,
    // where the key was still "handled" in the sense that it did its job.
    e.preventDefault();
    if (next.row === pos.row && next.col === pos.col) return;
    focusCell(tableIndex, next);
  };

  const empty = result.tables.length === 0;
  // The JSON view deliberately drops `code`: the snippet has its own segment.
  const { code, ...resultJson } = result;
  const csv = tablesToCsv(result.tables);
  const truncated = result.totalPages > result.processedPages;

  // Cell indices must match tableCitationsFor's fieldIndex space: a flat count
  // over every table's cells in order. Computed here as a running offset so
  // clicking a cell selects the same box the overlay drew.
  const offsets: number[] = [];
  let running = 0;
  for (const table of result.tables) {
    offsets.push(running);
    running += table.cells.length;
  }

  const payload = () => {
    if (view === "code") return code ?? "";
    if (view === "csv") return csv;
    return JSON.stringify(resultJson, null, 2);
  };

  const download = () => {
    const { type, name } = FILE_FOR_VIEW[view];
    downloadText(payload(), name, type);
  };

  return (
    <div>
      <div className="results-meta results-meta-grid">
        {result.timingMs != null && (
          <span className="mono muted">
            Elapsed time: {(result.timingMs / 1000).toFixed(1)}s
          </span>
        )}
        <span className="mono muted">
          {result.tableCount} {result.tableCount === 1 ? "table" : "tables"}
        </span>
        {/* Only when it actually happened. Production stops at
            MAX_PRERENDER_PAGES = 10, and a silent truncation reads as "this
            document has no tables past page 10". */}
        {truncated && (
          <span className="mono muted">
            {result.processedPages} of {result.totalPages} pages
          </span>
        )}
        <Toggle
          checked={showRegions}
          onChange={onShowRegionsChange}
          label="Show regions"
        />
      </div>

      {/* Paired with Show regions, exactly as OcrResults pairs it: a colour
          control is meaningless when nothing is drawn. By confidence stays the
          default — the tint is what makes the overlay say WHERE the model was
          unsure, and Custom trades that signal away deliberately. */}
      {showRegions && (
        <div className="citation-color">
          <span className="eyebrow">{REGION_COLOR}</span>
          <Segmented
            label={REGION_COLOR}
            options={[
              { label: "By confidence", value: "confidence" },
              { label: "Custom", value: "custom" },
            ]}
            value={colorMode}
            onChange={onColorModeChange}
          />
          {/* `embedded` is required, not decorative: HighlightColor's own
              wrapper carries .citation-color, and this block is already inside
              one. That rule's padding matches at ANY depth, so nesting them
              doubles the spacing — invisible to jsdom, caught only by reading
              the CSS and measuring.

              Rendered unconditionally now (no `colorMode === "custom"` gate):
              the chooser stays visible in By confidence too, and picking a
              colour is itself the gesture that switches to Custom. That
              composition happens HERE, at the call site — not by adding a mode
              prop to HighlightColor, which stays unaware that modes exist —
              so a swatch/dropper/hex change both sets the hex and flips the
              mode in one call. */}
          <HighlightColor
            label={REGION_COLOR}
            embedded
            value={citationHex}
            onChange={(hex) => {
              onCitationHexChange(hex);
              onColorModeChange("custom");
            }}
          />
        </div>
      )}

      {/* Outside the empty branch on purpose. OcrResults keeps its actions row
          inside the non-empty branch, so a no-result run offers no Code view —
          arguably the moment a prospect most wants to see which call ran. */}
      <div className="panel-row-h panel-row results-actions">
        <Segmented
          label="View"
          options={[
            { label: "Table", value: "table" },
            { label: "CSV", value: "csv" },
            { label: "JSON", value: "json" },
            { label: "Code", value: "code" },
          ]}
          value={view}
          onChange={setView}
        />
        <div className="results-actions-btns">
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => copyText(payload())}
          >
            Copy
          </button>
          <button type="button" className="btn ghost sm" onClick={download}>
            Download
          </button>
        </div>
      </div>

      {view === "code" ? (
        <pre className="ocr-text mono">
          {/* Not "run an extraction to see the code": `code` is optional so
              this view can merge before the backend deploys, and in that
              window the reader has JUST run one. */}
          {code ?? "# code snippet unavailable from this backend"}
        </pre>
      ) : view === "json" ? (
        <pre className="ocr-text mono">
          {JSON.stringify(resultJson, null, 2)}
        </pre>
      ) : view === "csv" ? (
        <pre className="ocr-text mono">{csv}</pre>
      ) : empty ? (
        <div className="callout" role="status">
          <span className="callout-label">No tables found</span>
          <p>
            The extraction completed but found no tables in this document. Try a
            document with a ruled or clearly aligned table — an invoice's line
            items or a financial statement.
          </p>
        </div>
      ) : (
        <>
          {/* Kept native table semantics over role="grid" (see the comment on
              <table> below), so nothing built into the roles announces that
              arrow keys work here. This is the discoverable substitute: a
              hidden instruction every table's aria-describedby points at.
              .sr-only already existed in app/globals.css — reused rather than
              adding a second visually-hidden utility class. */}
          <p id={TABLE_NAV_HINT_ID} className="sr-only">
            Use the arrow keys to move between cells, then Enter to show a
            cell's location on the page.
          </p>
          {result.tables.map((table, tableIndex) => {
            const grid = buildGrid(
              table.cells,
              table.rowCount,
              table.columnCount,
            );
            // Re-validated against THIS render's grid every time, not merely
            // defaulted once — see resolveRoving's comment for why a stored
            // position surviving a smaller/reshaped `result` was the round-3 bug.
            const roving = resolveRoving(grid, rovingByTable[tableIndex]);
            return (
              // biome-ignore lint/suspicious/noArrayIndexKey: table index is a stable positional key, same precedent as app/python-sdk/table-extraction/page.tsx
              <div className="studio-table-block" key={tableIndex}>
                <span className="eyebrow">
                  Table {tableIndex + 1} of {result.tables.length} ·{" "}
                  {table.rowCount}×{table.columnCount}
                </span>
                {/* Kept as a native <table>/<tr>/<td>, NOT re-rolled with
                  role="grid"/"row"/"gridcell": the APG grid pattern is more
                  standards-correct for arrow-navigable content, but it
                  overrides the row/column announcements a screen-reader user
                  already gets for free from a real table — the same tradeoff
                  this file already made for data-selected over aria-selected
                  (see the CSS comment on .studio-table td[data-selected]).
                  Roving tabindex lives purely on the <button>s below; it does
                  not require a grid role to work correctly. */}
                <table
                  className="field-table studio-table"
                  aria-describedby={TABLE_NAV_HINT_ID}
                >
                  <tbody>
                    {grid.map((row, rowIndex) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: row index is a stable grid position
                      <tr key={rowIndex}>
                        {row.map((c, colIndex) => {
                          // A null position is covered by a neighbour's span, so
                          // it renders nothing at all — not an empty <td>, which
                          // would push the rest of the row sideways.
                          if (!c) return null;
                          const cellIndex =
                            offsets[tableIndex] + table.cells.indexOf(c);
                          const isRoving =
                            roving.row === rowIndex && roving.col === colIndex;
                          return (
                            <td
                              // biome-ignore lint/suspicious/noArrayIndexKey: column index is a stable grid position
                              key={colIndex}
                              rowSpan={Math.max(1, c.rowSpan || 1)}
                              colSpan={Math.max(1, c.colSpan || 1)}
                              data-selected={cellIndex === activeIndex}
                            >
                              {/* A real <button>, not a div/td onClick: it is
                                keyboard-activatable for free (focus ring, Enter
                                and Space both work) with no onKeyDown of its
                                own needed for THAT part — and the <td> above
                                keeps its cell semantics rather than being
                                overloaded with a role="button" that would
                                strip it from a screen reader's table
                                navigation. Fills the cell (see
                                .studio-table .cell-select in styles.css), so
                                the mouse click area is exactly what the old
                                td onClick covered.

                                Exactly one button per table carries
                                tabIndex={0} (the roving position); every
                                other is -1, so Tab moves between TABLES, not
                                between every cell — the round-2 fix for the
                                95-tab-stop regression the per-cell button
                                introduced in round 1. onKeyDown is what moves
                                the roving position itself with the arrow
                                keys; it does not select. */}
                              <button
                                type="button"
                                className="cell-select"
                                tabIndex={isRoving ? 0 : -1}
                                ref={(el) => {
                                  const key = refKey(
                                    tableIndex,
                                    rowIndex,
                                    colIndex,
                                  );
                                  if (el) buttonRefs.current.set(key, el);
                                  else buttonRefs.current.delete(key);
                                }}
                                onKeyDown={(e) =>
                                  handleCellKeyDown(e, tableIndex, grid, {
                                    row: rowIndex,
                                    col: colIndex,
                                  })
                                }
                                onClick={() => {
                                  // Syncs the roving position to the clicked cell —
                                  // standard roving-tabindex behaviour. Without this,
                                  // clicking a cell selected it but left tabIndex=0 on
                                  // whatever the table's last ARROW-KEYED position was
                                  // (or the grid's first cell if none), so tabbing away
                                  // and back landed somewhere other than what was just
                                  // clicked. DOM focus is already on this button via
                                  // the native click; only the state needs updating,
                                  // not an imperative .focus() (that's focusCell's job
                                  // for arrow keys, which move focus without a click).
                                  setRovingByTable((prev) => ({
                                    ...prev,
                                    [tableIndex]: {
                                      row: rowIndex,
                                      col: colIndex,
                                    },
                                  }));
                                  onSelectCell(cellIndex);
                                }}
                              >
                                {c.text}
                                <span
                                  className={`match-dot ${confidenceTone(c.confidence)}`}
                                  role="img"
                                  aria-label={`confidence ${Math.round(c.confidence * 100)}%`}
                                />
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
