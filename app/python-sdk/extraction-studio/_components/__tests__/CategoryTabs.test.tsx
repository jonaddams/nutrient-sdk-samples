import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { DocSummary } from "../../lib/docs";
import { CategoryTabs } from "../CategoryTabs";

const doc = (docId: string, category: string): DocSummary => ({
  docId,
  label: docId,
  path: `/documents/${docId}.pdf`,
  filename: `${docId}.pdf`,
  hasTextLayer: true,
  category,
});

const docs = [doc("inv", "invoices"), doc("bol", "logistics")];

test("renders a tab only for categories that have documents", () => {
  render(<CategoryTabs docs={docs} value="invoices" onSelect={() => {}} />);
  expect(screen.getAllByRole("button")).toHaveLength(2);
  expect(screen.getByRole("button", { name: "Invoices" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Logistics" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Finance" })).toBeNull();
});

test("marks the active tab", () => {
  render(<CategoryTabs docs={docs} value="logistics" onSelect={() => {}} />);
  expect(screen.getByRole("button", { name: "Logistics" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Invoices" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("keeps the active tab even when its category is empty", () => {
  // The tab must not vanish under the user mid-interaction.
  render(<CategoryTabs docs={docs} value="claims" onSelect={() => {}} />);
  expect(screen.getByRole("button", { name: "Claims" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getAllByRole("button")).toHaveLength(3);
});

test("renders tabs in the declared order, not document order", () => {
  const reversed = [...docs].reverse();
  render(<CategoryTabs docs={reversed} value="invoices" onSelect={() => {}} />);
  expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual([
    "Invoices",
    "Logistics",
  ]);
});

test("renders a tab for a category the code does not know about", () => {
  // Otherwise such a document would be unreachable in the UI.
  render(
    <CategoryTabs
      docs={[doc("stray", "uncategorized"), ...docs]}
      value="invoices"
      onSelect={() => {}}
    />,
  );
  expect(
    screen.getByRole("button", { name: "uncategorized" }),
  ).toBeInTheDocument();
});

test("unknown categories sort after the known ones", () => {
  render(
    <CategoryTabs
      docs={[doc("stray", "zzz-unknown"), ...docs]}
      value="invoices"
      onSelect={() => {}}
    />,
  );
  const labels = screen.getAllByRole("button").map((b) => b.textContent);
  expect(labels[labels.length - 1]).toBe("zzz-unknown");
});

test("reports the chosen category", () => {
  const onSelect = vi.fn();
  render(<CategoryTabs docs={docs} value="invoices" onSelect={onSelect} />);
  fireEvent.click(screen.getByRole("button", { name: "Logistics" }));
  expect(onSelect).toHaveBeenCalledWith("logistics");
});

test("renders nothing when there are no documents at all", () => {
  const { container } = render(
    <CategoryTabs docs={[]} value="" onSelect={() => {}} />,
  );
  expect(container).toBeEmptyDOMElement();
});
