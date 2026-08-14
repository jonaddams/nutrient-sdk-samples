import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, test, vi } from "vitest";
import { FEATURES, FeatureRail } from "../FeatureRail";

/** Counts `enabled: true` occurrences in FeatureRail.tsx's own source, the same
 *  way a human would with `grep -c "enabled: true" FeatureRail.tsx` — so the
 *  live-feature count below is derived, never hand-incremented. This repo has
 *  a documented history of stale hardcoded counts drifting from reality (a
 *  landing page once claimed 57 samples when there were 76). */
function countEnabledTrueInSource(): number {
  const source = readFileSync(join(__dirname, "..", "FeatureRail.tsx"), "utf8");
  return (source.match(/enabled: true/g) ?? []).length;
}

test("rail lists features and selects an enabled one", () => {
  const onSelect = vi.fn();
  render(
    <FeatureRail features={FEATURES} value="structured" onSelect={onSelect} />,
  );
  expect(screen.getByText("Structured extraction")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Structured extraction"));
  expect(onSelect).toHaveBeenCalledWith("structured");
});

test("every rail entry is live — the rail no longer has a SOON section", () => {
  const byId = Object.fromEntries(FEATURES.map((f) => [f.id, f]));
  expect(byId.structured.enabled).toBe(true);
  expect(byId.handwriting.enabled).toBe(true);
  expect(byId.adaptive_ocr.enabled).toBe(true);
  expect(byId.multilingual.enabled).toBe(true);
  expect(byId.tables.enabled).toBe(true);
  expect(byId.markdown.enabled).toBe(true);
  expect(byId.describe.enabled).toBe(true);
  expect(byId.text.enabled).toBe(true);
  // Every entry, not a list of known-live ids: with Fast OCR retired the rail
  // is 8 of 8, so a NEW disabled entry should fail here and be argued for
  // rather than slipping in greyed out.
  expect(FEATURES.every((f) => f.enabled)).toBe(true);
  // Derived from the source, not hand-incremented — see
  // countEnabledTrueInSource's comment.
  expect(FEATURES.filter((f) => f.enabled).length).toBe(
    countEnabledTrueInSource(),
  );
  expect(countEnabledTrueInSource()).toBe(8);
  expect(FEATURES).toHaveLength(8);
});

test("every enabled feature is one the studio can render", () => {
  // Flipping an `enabled` flag without wiring a panel renders an empty shell.
  // This is the guard: enabling a rail entry must fail here until it is wired.
  const RENDERABLE = new Set([
    "structured",
    "handwriting",
    "adaptive_ocr",
    "multilingual",
    "tables",
    "describe",
    "markdown",
    "text",
  ]);
  for (const f of FEATURES.filter((x) => x.enabled)) {
    expect(RENDERABLE.has(f.id)).toBe(true);
  }
});

it("offers Multilingual OCR as a live feature, sharing OCR's engine on a bilingual document", () => {
  const entry = FEATURES.find((f) => f.id === "multilingual");
  expect(entry).toBeDefined();
  expect(entry?.enabled).toBe(true);
  expect(entry?.label).toBe("Multilingual OCR");
  // Blurbs are what a live entry shows on the rail; a disabled entry has only
  // a description.
  expect(entry?.blurb?.length ?? 0).toBeGreaterThan(0);
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

it("offers Text export as a live feature", () => {
  const entry = FEATURES.find((f) => f.id === "text");
  expect(entry).toBeDefined();
  expect(entry?.enabled).toBe(true);
  expect(entry?.label).toBe("Text export");
  // Blurbs are what a live entry shows on the rail; a disabled entry has only
  // a description.
  expect(entry?.blurb?.length ?? 0).toBeGreaterThan(0);
});

it("does not carry a Fast OCR entry — retired 2026-08-14, do not re-add", () => {
  // Retired for TWO independent reasons, and the second is the load-bearing
  // one because no future SDK setting can overturn it:
  //
  // 1. As a speed/accuracy TOGGLE it has nothing to turn on. OcrConfig.tsx's
  //    docstring records favor_accuracy, enable_preprocessing,
  //    enable_skew_detection and the words-detection threshold as
  //    byte-identical across both values on two documents (2026-08-06).
  // 2. As the capability its own copy described — "adds an invisible text
  //    layer to a scan so it becomes searchable" — there is NO SDK method for
  //    it on this build. Vision exposes extract_content / extract_structured /
  //    classify / detect_forms / detect_languages / generate_schema and their
  //    *_to_file variants, which write JSON, not a PDF; Document.export_as_pdf
  //    is a plain re-export with no OCR overlay. Verified by introspection
  //    2026-08-14.
  //
  // If a searchable-PDF story is ever wanted, check DWS rather than this SDK,
  // and make it its own sample rather than a rail entry. If a real
  // speed/accuracy axis is wanted, page raster DPI is the untested candidate
  // and needs a backend parameter first.
  expect(FEATURES.find((f) => f.id === "fast_ocr")).toBeUndefined();
});
