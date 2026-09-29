import { describe, expect, it } from "vitest";
import {
  ALL,
  filterFromParams,
  filterToQuery,
  matchesFilter,
  neighbours,
} from "../_lib/list-filter";
import type { ExtractionListItem } from "../_lib/types";

/**
 * The list page and the detail pager must agree on what "the list" is.
 *
 * Prev/next walks the list *as filtered*, and the filter travels between the
 * two routes in the URL. If the two pages matched rows differently, J would
 * land on a row the reader never saw — so both call these functions, and these
 * assertions pin the rules.
 */

function row(
  id: string,
  over: Partial<ExtractionListItem> = {},
): ExtractionListItem {
  return {
    id,
    email_id: `email-${id}`,
    from_address: "ap@vendor.example",
    subject: `Invoice ${id}`,
    received_at: null,
    status: "processed",
    attachment_count: 1,
    content_sha256: null,
    deduped_from: null,
    extracted_data: null,
    review_flags: [],
    context_flags: [],
    error_reason: null,
    created_at: "2026-09-29T12:00:00Z",
    ...over,
  } as ExtractionListItem;
}

describe("filterFromParams", () => {
  it("defaults to everything when the URL says nothing", () => {
    expect(filterFromParams(new URLSearchParams())).toEqual({
      status: ALL,
      q: "",
    });
  });

  it("reads status and search", () => {
    expect(
      filterFromParams(new URLSearchParams("status=needs_review&q=atlas")),
    ).toEqual({ status: "needs_review", q: "atlas" });
  });
});

describe("filterToQuery", () => {
  it("is empty for the unfiltered list, so plain URLs stay plain", () => {
    expect(filterToQuery({ status: ALL, q: "" })).toBe("");
    expect(filterToQuery({ status: ALL, q: "   " })).toBe("");
  });

  it("round-trips through filterFromParams", () => {
    const f = { status: "failed", q: "happy tooth & co" };
    const qs = filterToQuery(f);
    expect(qs.startsWith("?")).toBe(true);
    expect(filterFromParams(new URLSearchParams(qs.slice(1)))).toEqual(f);
  });
});

describe("matchesFilter", () => {
  it("filters on status", () => {
    const r = row("a", { status: "needs_review" });
    expect(matchesFilter(r, { status: "needs_review", q: "" })).toBe(true);
    expect(matchesFilter(r, { status: "processed", q: "" })).toBe(false);
    expect(matchesFilter(r, { status: ALL, q: "" })).toBe(true);
  });

  it("searches the envelope, case-insensitively", () => {
    const r = row("a", { from_address: "Billing@Atlas.example" });
    expect(matchesFilter(r, { status: ALL, q: "atlas" })).toBe(true);
    expect(matchesFilter(r, { status: ALL, q: "  ATLAS " })).toBe(true);
  });

  it("searches extracted scalar values, which is why you would search here", () => {
    const r = row("a", {
      extracted_data: { invoice_number: "AC-2025-1047", line_items: [] },
    });
    expect(matchesFilter(r, { status: ALL, q: "ac-2025" })).toBe(true);
  });

  it("does not search inside nested objects", () => {
    const r = row("a", {
      extracted_data: { line_items: [{ description: "Mouth mirror" }] },
    });
    expect(matchesFilter(r, { status: ALL, q: "mirror" })).toBe(false);
  });
});

describe("neighbours", () => {
  const rows = [
    row("a", { status: "needs_review" }),
    row("b"),
    row("c", { status: "needs_review" }),
    row("d", { status: "needs_review" }),
  ];
  const review = { status: "needs_review", q: "" };

  it("steps through only the filtered rows, in list order", () => {
    expect(neighbours(rows, "c", review)).toEqual({
      index: 1,
      total: 3,
      prevId: "a",
      nextId: "d",
    });
  });

  it("has no previous at the first row and no next at the last", () => {
    expect(neighbours(rows, "a", review)).toMatchObject({
      prevId: null,
      nextId: "c",
    });
    expect(neighbours(rows, "d", review)).toMatchObject({
      prevId: "c",
      nextId: null,
    });
  });

  it("returns null when the row is not in the filtered list, rather than guessing", () => {
    expect(neighbours(rows, "b", review)).toBeNull();
    expect(neighbours(rows, "zzz", { status: ALL, q: "" })).toBeNull();
  });
});
