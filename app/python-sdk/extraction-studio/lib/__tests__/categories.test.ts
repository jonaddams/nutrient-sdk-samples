import { describe, expect, test, vi } from "vitest";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  labelFor,
  presetFor,
} from "../categories";
import { DOCUMENTS } from "../docs";

describe("order and labels", () => {
  test("every category in the order has a label, and vice versa", () => {
    for (const id of CATEGORY_ORDER) {
      expect(CATEGORY_LABELS[id]).toBeTruthy();
    }
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual(
      [...CATEGORY_ORDER].sort(),
    );
  });

  test("labelFor falls back to the raw category name", () => {
    expect(labelFor("invoices")).toBe("Invoices");
    expect(labelFor("uncategorized")).toBe("uncategorized");
  });
});

describe("presets", () => {
  test("every category has a non-empty preset", () => {
    for (const id of CATEGORY_ORDER) {
      expect(presetFor(id).length).toBeGreaterThan(0);
    }
  });

  test("every row carries a usable key, type and description", () => {
    for (const id of CATEGORY_ORDER) {
      for (const row of presetFor(id)) {
        expect(row.key).toMatch(/^[a-zA-Z][a-zA-Z0-9]*$/);
        expect(["string", "number", "boolean"]).toContain(row.type);
        expect(row.description.length).toBeGreaterThan(0);
      }
    }
  });

  test("repeated calls return fresh rows with distinct ids", () => {
    // The factory exists so two categories never share row ids — a shared
    // literal would hand React duplicate keys.
    const first = presetFor("invoices");
    const second = presetFor("invoices");
    expect(first).not.toBe(second);
    const ids = [...first, ...second].map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("ids are distinct across different categories too", () => {
    const ids = CATEGORY_ORDER.flatMap((id) => presetFor(id).map((r) => r.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("mutating a returned row does not affect the next call", () => {
    presetFor("invoices")[0].key = "mutated";
    expect(presetFor("invoices")[0].key).toBe("invoiceNumber");
  });

  test("an unknown category falls back to invoices and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rows = presetFor("nope");
    expect(rows.map((r) => r.key)).toEqual(
      presetFor("invoices").map((r) => r.key),
    );
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test("the invoices preset still matches the previous hardcoded default", () => {
    expect(presetFor("invoices").map((r) => r.key)).toEqual([
      "invoiceNumber",
      "issueDate",
      "totalAmount",
    ]);
  });

  test("construction does not ask for fields its document lacks", () => {
    // The construction document is a submittal transmittal form with no dollar
    // figures at all. An earlier draft asked for contractAmount and
    // percentComplete, which could only ever return null.
    const keys = presetFor("construction").map((r) => r.key);
    expect(keys).not.toContain("contractAmount");
    expect(keys).not.toContain("percentComplete");
    expect(keys).toContain("projectName");
  });

  test("finance marks the statement-specific fields optional", () => {
    // No single Finance document fills all four, so none may be required.
    // Measured 2026-07-31: the income statement nulls totalAssets and
    // totalLiabilities; the balance sheet nulls only totalRevenue, because it
    // states net income in prose. periodEnding is on both documents.
    const rows = presetFor("finance");
    const optional = (k: string) => rows.find((r) => r.key === k)?.optional;
    expect(optional("totalRevenue")).toBe(true);
    expect(optional("netIncome")).toBe(true);
    expect(optional("totalAssets")).toBe(true);
    expect(optional("totalLiabilities")).toBe(true);
    expect(optional("periodEnding")).toBe(false);
  });

  test("amount fields are typed as numbers, not strings", () => {
    const numeric = [
      ["invoices", "totalAmount"],
      ["finance", "totalAssets"],
      ["logistics", "totalWeightKg"],
      ["healthcare", "facilitySubTotal"],
      ["claims", "estimatedDamage"],
    ] as const;
    for (const [cat, key] of numeric) {
      expect(presetFor(cat).find((r) => r.key === key)?.type).toBe("number");
    }
  });
});

describe("presets and documents agree", () => {
  test("every category in the order has at least one document", () => {
    // A tab with a preset but no document is a dead end; a document whose
    // category has no preset silently falls back to invoice fields.
    const present = new Set(DOCUMENTS.map((d) => d.category));
    for (const id of CATEGORY_ORDER) {
      expect(present.has(id)).toBe(true);
    }
  });

  test("every document's category is one the code knows about", () => {
    for (const d of DOCUMENTS) {
      expect(CATEGORY_ORDER).toContain(d.category);
    }
  });
});
