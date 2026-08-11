"use client";
import { useState } from "react";
import { copyText, downloadText } from "../lib/download";
import { confidenceTone } from "../lib/ocr";
import {
  buildGrid,
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
          {colorMode === "custom" && (
            // `embedded` is required, not decorative: HighlightColor's own
            // wrapper carries .citation-color, and this block is already inside
            // one. That rule's padding matches at ANY depth, so nesting them
            // doubles the spacing — invisible to jsdom, caught only by reading
            // the CSS and measuring.
            <HighlightColor
              label={REGION_COLOR}
              embedded
              value={citationHex}
              onChange={onCitationHexChange}
            />
          )}
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
        result.tables.map((table, tableIndex) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: table index is a stable positional key, same precedent as app/python-sdk/table-extraction/page.tsx
          <div className="studio-table-block" key={tableIndex}>
            <span className="eyebrow">
              Table {tableIndex + 1} of {result.tables.length} ·{" "}
              {table.rowCount}×{table.columnCount}
            </span>
            <table className="field-table studio-table">
              <tbody>
                {buildGrid(table.cells, table.rowCount, table.columnCount).map(
                  (row, rowIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: row index is a stable grid position
                    <tr key={rowIndex}>
                      {row.map((c, colIndex) => {
                        // A null position is covered by a neighbour's span, so
                        // it renders nothing at all — not an empty <td>, which
                        // would push the rest of the row sideways.
                        if (!c) return null;
                        const cellIndex =
                          offsets[tableIndex] + table.cells.indexOf(c);
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
                                and Space both work) with no tabIndex, onKeyDown
                                or ARIA role needed — and the <td> above keeps
                                its cell semantics rather than being overloaded
                                with a role="button" that would strip it from a
                                screen reader's table navigation. Fills the cell
                                (see .studio-table .cell-select in styles.css),
                                so the mouse click area is exactly what the old
                                td onClick covered. */}
                            <button
                              type="button"
                              className="cell-select"
                              onClick={() => onSelectCell(cellIndex)}
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
                  ),
                )}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
