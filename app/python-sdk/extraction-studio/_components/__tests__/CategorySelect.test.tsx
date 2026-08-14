import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { DocSummary } from "../../lib/docs";
import { CategorySelect } from "../CategorySelect";

// Rewritten from CategoryTabs.test.tsx when the control became a <select>.
// Every guarantee the tab version made is still asserted here — presence,
// active marking, the empty-category case, declared ordering, unknown-category
// reachability, unknown sort position, the onSelect contract, and the
// render-nothing case. Only the mechanism changed: option lists and a value
// instead of buttons and aria-pressed.

const doc = (docId: string, category: string): DocSummary => ({
  docId,
  label: docId,
  path: `/documents/${docId}.pdf`,
  filename: `${docId}.pdf`,
  hasTextLayer: true,
  category,
});

const docs = [doc("inv", "invoices"), doc("bol", "logistics")];

const optionLabels = () =>
  screen.getAllByRole("option").map((o) => o.textContent);

test("renders an option only for categories that have documents", () => {
  render(<CategorySelect docs={docs} value="invoices" onSelect={() => {}} />);
  expect(optionLabels()).toEqual(["Invoices", "Logistics"]);
  expect(screen.queryByRole("option", { name: "Finance" })).toBeNull();
});

test("the select reflects the active category", () => {
  render(<CategorySelect docs={docs} value="logistics" onSelect={() => {}} />);
  expect(screen.getByLabelText("Document type")).toHaveValue("logistics");
});

test("keeps the active category even when it is empty", () => {
  // The current selection must not vanish under the user mid-interaction.
  render(<CategorySelect docs={docs} value="claims" onSelect={() => {}} />);
  expect(screen.getByLabelText("Document type")).toHaveValue("claims");
  expect(optionLabels()).toContain("Claims");
  expect(screen.getAllByRole("option")).toHaveLength(3);
});

test("renders options in the declared order, not document order", () => {
  const reversed = [...docs].reverse();
  render(
    <CategorySelect docs={reversed} value="invoices" onSelect={() => {}} />,
  );
  expect(optionLabels()).toEqual(["Invoices", "Logistics"]);
});

test("renders an option for a category the code does not know about", () => {
  // Otherwise such a document would be unreachable in the UI.
  render(
    <CategorySelect
      docs={[doc("stray", "uncategorized"), ...docs]}
      value="invoices"
      onSelect={() => {}}
    />,
  );
  expect(
    screen.getByRole("option", { name: "uncategorized" }),
  ).toBeInTheDocument();
});

test("unknown categories sort after the known ones", () => {
  render(
    <CategorySelect
      docs={[doc("stray", "zzz-unknown"), ...docs]}
      value="invoices"
      onSelect={() => {}}
    />,
  );
  const labels = optionLabels();
  expect(labels[labels.length - 1]).toBe("zzz-unknown");
});

test("reports the chosen category", () => {
  const onSelect = vi.fn();
  render(<CategorySelect docs={docs} value="invoices" onSelect={onSelect} />);
  fireEvent.change(screen.getByLabelText("Document type"), {
    target: { value: "logistics" },
  });
  expect(onSelect).toHaveBeenCalledWith("logistics");
});

test("the label is wired to the select", () => {
  // getByLabelText above only proves association if the htmlFor/id pair is
  // real, so pin it directly — a detached label would still render fine.
  render(<CategorySelect docs={docs} value="invoices" onSelect={() => {}} />);
  expect(screen.getByLabelText("Document type").tagName).toBe("SELECT");
});

test("renders nothing when there are no documents at all", () => {
  const { container } = render(
    <CategorySelect docs={[]} value="" onSelect={() => {}} />,
  );
  expect(container).toBeEmptyDOMElement();
});

test("separates industry verticals from feature showcases", () => {
  // Two axes in one control. Before grouping, "Healthcare" and "Handwriting"
  // sat as peers — a category error a prospect can see — and the capability
  // documents could only be found by opening a dropdown nothing pointed at.
  render(
    <CategorySelect
      docs={[
        doc("a", "invoices"),
        doc("b", "healthcare"),
        doc("c", "handwriting"),
      ]}
      value="invoices"
      onSelect={() => {}}
    />,
  );
  const industry = screen.getByRole("group", { name: "By industry" });
  const showcase = screen.getByRole("group", { name: "Feature showcases" });

  // Asserted per-group, not just "both groups exist": a grouping that put
  // every option in the first group would pass a presence-only check.
  expect(industry).toContainElement(
    screen.getByRole("option", { name: "Invoices" }),
  );
  expect(industry).toContainElement(
    screen.getByRole("option", { name: "Healthcare" }),
  );
  expect(showcase).toContainElement(
    screen.getByRole("option", { name: "Handwriting" }),
  );
  expect(industry).not.toContainElement(
    screen.getByRole("option", { name: "Handwriting" }),
  );
});

test("omits a group entirely rather than rendering it empty", () => {
  render(
    <CategorySelect
      docs={[doc("a", "invoices")]}
      value="invoices"
      onSelect={() => {}}
    />,
  );
  expect(
    screen.getByRole("group", { name: "By industry" }),
  ).toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "Feature showcases" })).toBeNull();
});

test("keeps an unknown category reachable, outside both groups", () => {
  // The pre-existing guarantee: a document with no way to reach it is worse
  // than an unlabelled option. Grouping must not have quietly dropped it.
  render(
    <CategorySelect
      docs={[doc("a", "invoices"), doc("b", "mystery")]}
      value="invoices"
      onSelect={() => {}}
    />,
  );
  const unknown = screen.getByRole("option", { name: "mystery" });
  expect(unknown).toBeInTheDocument();
  expect(
    screen.getByRole("group", { name: "By industry" }),
  ).not.toContainElement(unknown);
});
