import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TablesResult } from "../../lib/tables";
import { TablesResults } from "../TablesResults";

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
});
