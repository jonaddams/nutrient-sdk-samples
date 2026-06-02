import { describe, expect, it } from "vitest";
import { parseFieldNames } from "../fieldNames";

describe("parseFieldNames", () => {
  it("splits a comma-separated string and trims", () => {
    expect(parseFieldNames("invoice_number, total , due_date")).toEqual([
      "invoice_number",
      "total",
      "due_date",
    ]);
  });
  it("drops empty entries", () => {
    expect(parseFieldNames("a,,b, ,c")).toEqual(["a", "b", "c"]);
  });
  it("returns an empty array for blank input", () => {
    expect(parseFieldNames("   ")).toEqual([]);
  });
});
