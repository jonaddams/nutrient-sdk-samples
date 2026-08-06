import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { DocSummary } from "../../lib/docs";
import { DocStrip } from "../DocStrip";

const docs: DocSummary[] = [
  {
    docId: "invoice-ac20251047",
    label: "Atlas Construction invoice",
    path: "/invoices/Invoice AC-2025-1047.pdf",
    filename: "invoice-ac20251047.pdf",
    hasTextLayer: true,
    category: "invoices",
  },
  {
    docId: "scanned-invoice",
    label: "Scanned invoice",
    path: "/documents/scanned-invoice.pdf",
    filename: "scanned-invoice.pdf",
    hasTextLayer: false,
    category: "invoices",
  },
];

test("renders a chip per document and marks the active one", () => {
  render(
    <DocStrip
      docs={docs}
      value="scanned-invoice"
      category="invoices"
      onSelect={() => {}}
    />,
  );
  expect(screen.getAllByRole("button")).toHaveLength(2);
  expect(
    screen.getByRole("button", { name: /Scanned invoice/ }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(
    screen.getByRole("button", { name: /Atlas Construction invoice/ }),
  ).toHaveAttribute("aria-pressed", "false");
});

// This REPLACES a test that asserted no badge exists. That assertion was correct
// for its time — the old badge was a flex sibling of the label and stole width in
// the 208px rail column — and it was written so that re-adding one had to be
// deliberate. This is that deliberate act (Jon, 2026-08-06): four of ten
// documents have no text layer and only one used to say so, via a label naming
// the property rather than the document.
//
// The marker is a CHILD of .doc-chip-name, so it shares the label's text flow and
// takes no fixed width. If a future change makes it a sibling again, the original
// problem returns — the width, not the marker, was the objection.
test("marks documents with no text layer, and only those", () => {
  render(
    <DocStrip
      docs={docs}
      value="scanned-invoice"
      category="invoices"
      onSelect={() => {}}
    />,
  );
  const marks = screen.getAllByText("scan");
  expect(marks).toHaveLength(1);
  // it belongs to the scanned chip, not the text-layer one
  expect(marks[0].closest("button")).toBe(
    screen.getByRole("button", { name: /Scanned invoice/ }),
  );
  expect(
    screen.getByRole("button", { name: /Atlas Construction invoice/ }),
  ).not.toHaveTextContent("scan");
});

test("the accessible name separates label from marker", () => {
  // margin-left is visual only. Without a real space the button's accessible
  // name concatenates to "Scanned invoicescan", which is what a screen reader
  // would read out.
  render(
    <DocStrip
      docs={docs}
      value="scanned-invoice"
      category="invoices"
      onSelect={() => {}}
    />,
  );
  const btn = screen.getByRole("button", { name: /Scanned invoice/ });
  expect(btn.textContent).toBe("Scanned invoice scan");
  expect(btn.textContent).not.toContain("invoicescan");
});

test("the scan marker sits inside the label, not beside it", () => {
  // The width objection that removed the original badge applies to a SIBLING of
  // .doc-chip-name. Nesting is what makes this affordable, so it is pinned.
  const { container } = render(
    <DocStrip
      docs={docs}
      value="scanned-invoice"
      category="invoices"
      onSelect={() => {}}
    />,
  );
  const mark = container.querySelector(".doc-chip-scan");
  expect(mark).not.toBeNull();
  expect(mark?.parentElement).toHaveClass("doc-chip-name");
});

test("shows the readable label rather than the docId", () => {
  render(
    <DocStrip
      docs={docs}
      value="scanned-invoice"
      category="invoices"
      onSelect={() => {}}
    />,
  );
  expect(screen.getByText("Atlas Construction invoice")).toBeInTheDocument();
  expect(screen.queryByText("invoice-ac20251047")).toBeNull();
});

test("reports the chosen document by docId, not by label", () => {
  // The label is display-only; selection state is keyed on docId, so rewording
  // a label must never change what gets reported.
  const onSelect = vi.fn();
  render(
    <DocStrip
      docs={docs}
      value="scanned-invoice"
      category="invoices"
      onSelect={onSelect}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: /Atlas Construction invoice/ }),
  );
  expect(onSelect).toHaveBeenCalledWith("invoice-ac20251047");
});

test("shows an empty state naming the category when it has no documents", () => {
  render(<DocStrip docs={[]} value="" category="claims" onSelect={() => {}} />);
  expect(screen.queryAllByRole("button")).toHaveLength(0);
  // The readable label, not the raw id — this is user-facing copy.
  expect(
    screen.getByText(/No documents in the Claims category/),
  ).toBeInTheDocument();
});
