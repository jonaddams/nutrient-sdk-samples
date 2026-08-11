import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TablesResult } from "../../lib/tables";
import { TablesResults } from "../TablesResults";

/** Real Tab presses until `target` is focused, capped so a markup regression
 *  that drops the control from the tab order fails the test with a clear
 *  assertion instead of hanging. A hardcoded tab count would be brittle —
 *  it would silently start counting a DIFFERENT button the moment an
 *  unrelated control (e.g. a HighlightColor swatch) is added earlier in the
 *  DOM, without this test's markup changing at all. */
async function tabTo(
  user: ReturnType<typeof userEvent.setup>,
  target: Element,
) {
  for (let i = 0; i < 40 && document.activeElement !== target; i++) {
    await user.tab();
  }
  expect(document.activeElement).toBe(target);
}

const base = {
  activeIndex: null,
  onSelectCell: () => {},
  showRegions: false,
  onShowRegionsChange: () => {},
  colorMode: "confidence" as const,
  onColorModeChange: () => {},
  citationHex: "#ffc107",
  onCitationHexChange: () => {},
};

/** Fills every row/column of a rowCount x columnCount grid with a real,
 *  distinctly-labelled cell — hoisted so both the tab-stop-count test and
 *  the stale-roving-position regression test below can build tables larger
 *  than the four-cell default fixture without duplicating this. */
function fullGrid(rows: number, cols: number, prefix: string) {
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < cols; column++) {
      cells.push({
        row,
        column,
        rowSpan: 1,
        colSpan: 1,
        text: `${prefix}${row}-${column}`,
        confidence: 0.9,
        bounds: null,
      });
    }
  }
  return cells;
}

const result = (over: Partial<TablesResult> = {}): TablesResult => ({
  engine: "VLM_TABLES",
  filename: "x.pdf",
  provider: "claude",
  tableCount: 1,
  tables: [
    {
      rowCount: 2,
      columnCount: 2,
      cells: [
        {
          row: 0,
          column: 0,
          rowSpan: 1,
          colSpan: 1,
          text: "Item",
          confidence: 0.99,
          bounds: null,
        },
        {
          row: 0,
          column: 1,
          rowSpan: 1,
          colSpan: 1,
          text: "Qty",
          confidence: 0.98,
          bounds: null,
        },
        {
          row: 1,
          column: 0,
          rowSpan: 1,
          colSpan: 1,
          text: "Concrete",
          confidence: 0.95,
          bounds: null,
        },
        {
          row: 1,
          column: 1,
          rowSpan: 1,
          colSpan: 1,
          text: "120",
          confidence: 0.91,
          bounds: null,
        },
      ],
    },
  ],
  rawElements: [],
  totalPages: 1,
  processedPages: 1,
  code: "print('hi')",
  timingMs: 1234,
  ...over,
});

describe("TablesResults", () => {
  it("offers four views", () => {
    render(<TablesResults {...base} result={result()} />);
    const group = screen.getByRole("group", { name: "View" });
    for (const name of ["Table", "CSV", "JSON", "Code"]) {
      expect(group).toContainElement(screen.getByRole("button", { name }));
    }
  });

  it("renders the grid with its cell text", () => {
    render(<TablesResults {...base} result={result()} />);
    expect(screen.getByText("Concrete")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
  });

  it("labels each table with its position and dimensions", () => {
    const two = result({
      tableCount: 2,
      tables: [
        {
          rowCount: 1,
          columnCount: 1,
          cells: [
            {
              row: 0,
              column: 0,
              rowSpan: 1,
              colSpan: 1,
              text: "a",
              confidence: 1,
              bounds: null,
            },
          ],
        },
        {
          rowCount: 1,
          columnCount: 1,
          cells: [
            {
              row: 0,
              column: 0,
              rowSpan: 1,
              colSpan: 1,
              text: "b",
              confidence: 1,
              bounds: null,
            },
          ],
        },
      ],
    });
    render(<TablesResults {...base} result={two} />);
    expect(screen.getByText(/Table 1 of 2/)).toBeInTheDocument();
    expect(screen.getByText(/Table 2 of 2/)).toBeInTheDocument();
  });

  it("names its empty state rather than showing a blank pane", () => {
    render(
      <TablesResults
        {...base}
        result={result({ tableCount: 0, tables: [] })}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(/no tables found/i);
  });

  it("still offers the Code view on an empty result", () => {
    // OcrResults keeps its actions row inside the non-empty branch, so a
    // no-result run offers no Code view — the moment a prospect most wants to
    // see the call that produced nothing. Not repeating that here.
    render(
      <TablesResults
        {...base}
        result={result({ tableCount: 0, tables: [] })}
      />,
    );
    expect(screen.getByRole("button", { name: "Code" })).toBeInTheDocument();
  });

  it("surfaces the page cap when the document was truncated", () => {
    render(
      <TablesResults
        {...base}
        result={result({ totalPages: 14, processedPages: 10 })}
      />,
    );
    expect(screen.getByText(/10 of 14 pages/)).toBeInTheDocument();
  });

  it("says nothing about pages when the whole document was processed", () => {
    render(
      <TablesResults
        {...base}
        result={result({ totalPages: 3, processedPages: 3 })}
      />,
    );
    expect(screen.queryByText(/of 3 pages/)).toBeNull();
  });

  it("hides the region colour block until regions are shown", () => {
    render(<TablesResults {...base} result={result()} showRegions={false} />);
    expect(screen.queryByRole("group", { name: /region color/i })).toBeNull();
  });

  it("shows the region colour mode toggle when regions are on", () => {
    render(<TablesResults {...base} result={result()} showRegions={true} />);
    expect(
      screen.getByRole("group", { name: /region color/i }),
    ).toBeInTheDocument();
  });

  it("renders HighlightColor embedded, so its padding is not doubled", () => {
    // #64's trap: a .citation-color div nested inside HighlightColor's own
    // .citation-color div doubles that rule's padding, and it matches at any
    // depth. jsdom computes no layout, so this asserts the STRUCTURE instead.
    const { container } = render(
      <TablesResults
        {...base}
        result={result()}
        showRegions={true}
        colorMode="custom"
      />,
    );
    expect(container.querySelectorAll(".citation-color")).toHaveLength(1);
  });

  it("Tab reaches a table's roving cell, and Enter selects it", async () => {
    // The gap this closes: a bare `<td onClick>` is mouse-only. The fix is a
    // real <button> inside the cell, which is reachable by Tab and activates
    // on Enter with no onKeyDown of its own needed for THAT part. Only ONE
    // button per table is reachable by Tab at all — see the roving-tabindex
    // test below — so this targets "Item", the grid's first real cell and
    // therefore the roving default before any arrow key has moved it.
    const user = userEvent.setup();
    const onSelectCell = vi.fn();
    render(
      <TablesResults {...base} result={result()} onSelectCell={onSelectCell} />,
    );
    const target = screen.getByText("Item").closest("button");
    expect(target).not.toBeNull();
    await tabTo(user, target as HTMLButtonElement);
    await user.keyboard("{Enter}");
    expect(onSelectCell).toHaveBeenCalledWith(0);
  });

  it("Space also selects the focused cell", async () => {
    const user = userEvent.setup();
    const onSelectCell = vi.fn();
    render(
      <TablesResults {...base} result={result()} onSelectCell={onSelectCell} />,
    );
    const target = screen.getByText("Item").closest("button");
    expect(target).not.toBeNull();
    await tabTo(user, target as HTMLButtonElement);
    await user.keyboard(" ");
    expect(onSelectCell).toHaveBeenCalledWith(0);
  });

  it("a click still selects a cell", async () => {
    // Never actually asserted before this round — round 1 added Enter/Space
    // coverage but not the plain mouse path the button was built to preserve.
    const user = userEvent.setup();
    const onSelectCell = vi.fn();
    render(
      <TablesResults {...base} result={result()} onSelectCell={onSelectCell} />,
    );
    await user.click(screen.getByText("Concrete"));
    // "Concrete" is row 1, column 0 of the only table — flat cell index 2.
    expect(onSelectCell).toHaveBeenCalledWith(2);
  });

  it("gives each table exactly one tab stop, not one per cell", () => {
    // Round 2's whole reason to exist: round 1 put a button in every <td>,
    // which on the real fixture's 5 tables (24/42/12/5/12 cells) meant ~95
    // sequential tab stops to get past one panel. Whatever the cell count,
    // the number of tabIndex=0 cell buttons must equal the number of TABLES —
    // never the number of cells — or this regresses silently again.
    const multi = result({
      tableCount: 3,
      tables: [
        { rowCount: 2, columnCount: 2, cells: fullGrid(2, 2, "a") },
        { rowCount: 3, columnCount: 3, cells: fullGrid(3, 3, "b") },
        { rowCount: 1, columnCount: 1, cells: fullGrid(1, 1, "c") },
      ],
    });
    const { container } = render(<TablesResults {...base} result={multi} />);
    const rovingButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".cell-select"),
    ).filter((button) => button.tabIndex === 0);
    expect(rovingButtons).toHaveLength(multi.tables.length);
  });

  it("ArrowRight moves focus to the next cell without selecting it", async () => {
    const user = userEvent.setup();
    const onSelectCell = vi.fn();
    render(
      <TablesResults {...base} result={result()} onSelectCell={onSelectCell} />,
    );
    const item = screen
      .getByText("Item")
      .closest("button") as HTMLButtonElement;
    const qty = screen.getByText("Qty").closest("button") as HTMLButtonElement;
    await tabTo(user, item);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(qty);
    expect(onSelectCell).not.toHaveBeenCalled();
  });

  it("clamps at the table's last cell instead of wrapping", async () => {
    const user = userEvent.setup();
    render(<TablesResults {...base} result={result()} />);
    const item = screen
      .getByText("Item")
      .closest("button") as HTMLButtonElement;
    const last = screen.getByText("120").closest("button") as HTMLButtonElement;
    await tabTo(user, item);
    // Item(0,0) -> Qty(0,1) -> 120(1,1): right, then down, then right again.
    await user.keyboard("{ArrowRight}{ArrowDown}{ArrowRight}");
    expect(document.activeElement).toBe(last);
    // One more Right at the grid's last column: clamps, does not wrap to the
    // next row or leave the table.
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(last);
  });

  it("clamps a stale roving position when rerendered with a smaller table", async () => {
    // Round 3's bug: rovingByTable persists across runs (this panel is never
    // remounted — page.tsx renders it with no `key`), so a position
    // arrow-keyed deep into a big table pointed at NOTHING once `result` was
    // replaced by a smaller one — not just "that table has no reachable
    // cell", but ZERO buttons anywhere with tabIndex=0, because the stored
    // {row, col} matched no cell in the new grid. Uses `rerender` on ONE
    // instance on purpose: a fresh `render` per result would pass even
    // against the broken code, since a fresh mount never has a stale
    // position to begin with.
    const user = userEvent.setup();
    const big = result({
      tableCount: 1,
      tables: [{ rowCount: 5, columnCount: 6, cells: fullGrid(5, 6, "x") }],
    });
    const { container, rerender } = render(
      <TablesResults {...base} result={big} />,
    );
    const first = screen
      .getByText("x0-0")
      .closest("button") as HTMLButtonElement;
    await tabTo(user, first);
    // Arrow well past the 5x6 grid's bottom-right corner; step() clamps, so
    // this reliably lands on the LAST real cell regardless of exact size.
    await user.keyboard("{ArrowRight}".repeat(10) + "{ArrowDown}".repeat(10));

    const small = result({
      tableCount: 1,
      tables: [{ rowCount: 1, columnCount: 3, cells: fullGrid(1, 3, "y") }],
    });
    rerender(<TablesResults {...base} result={small} />);

    const rovingButtons = Array.from(
      container.querySelectorAll<HTMLButtonElement>(".cell-select"),
    ).filter((button) => button.tabIndex === 0);
    expect(rovingButtons).toHaveLength(small.tables.length);
  });

  it("ArrowRight steps over a span's null hole to the next real cell", async () => {
    // buildGrid leaves the position(s) a rowSpan/colSpan covers as null.
    // step() is sound by inspection (it loops until it finds a truthy grid
    // cell), but nothing pinned that before this test: a single row here is
    // [Wide(colSpan 2), null, Narrow] — arrowing right from Wide must land on
    // Narrow, not stop on the hole or land nowhere.
    const user = userEvent.setup();
    const spanned = result({
      tableCount: 1,
      tables: [
        {
          rowCount: 1,
          columnCount: 3,
          cells: [
            {
              row: 0,
              column: 0,
              rowSpan: 1,
              colSpan: 2,
              text: "Wide",
              confidence: 0.9,
              bounds: null,
            },
            {
              row: 0,
              column: 2,
              rowSpan: 1,
              colSpan: 1,
              text: "Narrow",
              confidence: 0.9,
              bounds: null,
            },
          ],
        },
      ],
    });
    render(<TablesResults {...base} result={spanned} />);
    const wide = screen
      .getByText("Wide")
      .closest("button") as HTMLButtonElement;
    const narrow = screen
      .getByText("Narrow")
      .closest("button") as HTMLButtonElement;
    await tabTo(user, wide);
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(narrow);
  });

  it("offsets a clicked cell's index by every earlier table's cell count", async () => {
    // The multi-table misalignment class this codebase already fixed once in
    // 77fa9c1: a cell's flat index must be offsets[tableIndex] + its
    // within-table position, not the within-table position alone. Every
    // other click test in this file uses a single-table result, where that
    // offset is always 0 and cannot expose a regression here.
    const user = userEvent.setup();
    const onSelectCell = vi.fn();
    const multi = result({
      tableCount: 2,
      tables: [
        { rowCount: 1, columnCount: 2, cells: fullGrid(1, 2, "a") },
        { rowCount: 1, columnCount: 2, cells: fullGrid(1, 2, "b") },
      ],
    });
    render(
      <TablesResults {...base} result={multi} onSelectCell={onSelectCell} />,
    );
    // "b0-1" is table 2's second cell — within-table index 1. Table 1 has 2
    // cells, so the correct flat index is 2 + 1 = 3, not 1.
    await user.click(screen.getByText("b0-1"));
    expect(onSelectCell).toHaveBeenCalledWith(3);
  });

  it("Home/End move focus to the row's first/last real cell, skipping a span's hole", async () => {
    // rowEdge is reachable only via Home/End, and nothing else in this file
    // presses them. Reuses the span layout from the ArrowRight-over-a-hole
    // test above: [Wide(colSpan 2), null, Narrow] — End from Wide must land
    // on Narrow (skipping the null the span leaves at column 1), and Home
    // from Narrow must land back on Wide.
    const user = userEvent.setup();
    const spanned = result({
      tableCount: 1,
      tables: [
        {
          rowCount: 1,
          columnCount: 3,
          cells: [
            {
              row: 0,
              column: 0,
              rowSpan: 1,
              colSpan: 2,
              text: "Wide",
              confidence: 0.9,
              bounds: null,
            },
            {
              row: 0,
              column: 2,
              rowSpan: 1,
              colSpan: 1,
              text: "Narrow",
              confidence: 0.9,
              bounds: null,
            },
          ],
        },
      ],
    });
    render(<TablesResults {...base} result={spanned} />);
    const wide = screen
      .getByText("Wide")
      .closest("button") as HTMLButtonElement;
    const narrow = screen
      .getByText("Narrow")
      .closest("button") as HTMLButtonElement;
    await tabTo(user, wide);
    await user.keyboard("{End}");
    expect(document.activeElement).toBe(narrow);
    await user.keyboard("{Home}");
    expect(document.activeElement).toBe(wide);
  });

  it("a click also sets the roving position, so tabbing back returns to the clicked cell", async () => {
    // Standard roving-tabindex behaviour: without this, a click selected the
    // cell but left tabIndex=0 on the table's previous roving position (the
    // grid's first cell, since no arrow key has moved it yet), so leaving
    // and re-entering the table by Tab landed somewhere other than what was
    // just clicked.
    const user = userEvent.setup();
    const onSelectCell = vi.fn();
    render(
      <TablesResults {...base} result={result()} onSelectCell={onSelectCell} />,
    );
    const target = screen
      .getByText("120")
      .closest("button") as HTMLButtonElement;
    const defaultCell = screen
      .getByText("Item")
      .closest("button") as HTMLButtonElement;
    await user.click(target);
    expect(onSelectCell).toHaveBeenCalledWith(3);
    expect(target.tabIndex).toBe(0);
    expect(defaultCell.tabIndex).toBe(-1);
  });

  it("describes the arrow-key navigation for screen-reader users", () => {
    // Native table semantics were kept over role="grid" (see the component's
    // comment), so nothing built into ARIA announces that arrow keys work
    // here. This is the discoverable substitute: aria-describedby pointing
    // at a visually-hidden hint.
    render(<TablesResults {...base} result={result()} />);
    const table = screen.getByText("Item").closest("table");
    const describedBy = table?.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toHaveTextContent(
      /arrow keys/i,
    );
  });
});
