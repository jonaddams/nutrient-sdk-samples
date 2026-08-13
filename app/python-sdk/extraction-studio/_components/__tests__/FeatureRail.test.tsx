import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, test, vi } from "vitest";
import { FEATURES, FeatureRail } from "../FeatureRail";

test("rail lists features and selects an enabled one", () => {
  const onSelect = vi.fn();
  render(
    <FeatureRail features={FEATURES} value="structured" onSelect={onSelect} />,
  );
  expect(screen.getByText("Structured extraction")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Structured extraction"));
  expect(onSelect).toHaveBeenCalledWith("structured");
});

test("the six live features are enabled and the other SOON entries are not", () => {
  const byId = Object.fromEntries(FEATURES.map((f) => [f.id, f]));
  expect(byId.structured.enabled).toBe(true);
  expect(byId.handwriting.enabled).toBe(true);
  expect(byId.adaptive_ocr.enabled).toBe(true);
  expect(byId.tables.enabled).toBe(true);
  expect(byId.markdown.enabled).toBe(true);
  expect(byId.describe.enabled).toBe(true);
  for (const id of ["multilingual", "fast_ocr", "text"]) {
    expect(byId[id].enabled).toBe(false);
  }
});

test("every enabled feature is one the studio can render", () => {
  // Flipping an `enabled` flag without wiring a panel renders an empty shell.
  // This is the guard: enabling a rail entry must fail here until it is wired.
  const RENDERABLE = new Set([
    "structured",
    "handwriting",
    "adaptive_ocr",
    "tables",
    "describe",
    "markdown",
  ]);
  for (const f of FEATURES.filter((x) => x.enabled)) {
    expect(RENDERABLE.has(f.id)).toBe(true);
  }
});

it("offers Markdown export as a live feature", () => {
  const entry = FEATURES.find((f) => f.id === "markdown");
  expect(entry).toBeDefined();
  expect(entry?.enabled).toBe(true);
  expect(entry?.label).toBe("Markdown export");
  // Blurbs are what a live entry shows on the rail; a disabled entry has
  // only a description.
  expect(entry?.blurb?.length ?? 0).toBeGreaterThan(0);
});

it("keeps Text export as a separate, still-unbuilt entry", () => {
  // export_as_text is a different SDK call with different output; shipping
  // Markdown export does not deliver it.
  expect(FEATURES.find((f) => f.id === "text")?.enabled).toBe(false);
});
