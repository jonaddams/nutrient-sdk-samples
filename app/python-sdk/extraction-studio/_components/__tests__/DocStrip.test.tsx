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

test("labels documents by whether they have a text layer", () => {
  render(
    <DocStrip
      docs={docs}
      value="scanned-invoice"
      category="invoices"
      onSelect={() => {}}
    />,
  );
  expect(screen.getByText("text")).toBeInTheDocument();
  expect(screen.getByText("scanned")).toBeInTheDocument();
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
