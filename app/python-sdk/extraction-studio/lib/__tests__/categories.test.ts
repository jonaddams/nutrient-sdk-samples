import { describe, expect, test, vi } from "vitest";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  guidanceFor,
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

  test("construction asks for the pay application's own fields, not the retired submittal form's", () => {
    // construction-pay-application.pdf (an AIA G702-style certificate)
    // replaced the westbridge submittal transmittal form on 2026-08-12 (see
    // SDK-051 in docs/internal/sdk-defects/). The old fields describe a
    // document that no longer exists in the corpus.
    const keys = presetFor("construction").map((r) => r.key);
    for (const retired of [
      "submittalNumber",
      "specSection",
      "submittedBy",
      "dateRequired",
    ]) {
      expect(keys).not.toContain(retired);
    }
    expect(keys).toContain("projectName");
    expect(keys).toContain("contractSumToDate");
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
      ["construction", "contractSumToDate"],
      ["logistics", "totalWeightKg"],
      ["healthcare", "facilitySubTotal"],
      ["claims", "estimatedDamage"],
    ] as const;
    for (const [cat, key] of numeric) {
      expect(presetFor(cat).find((r) => r.key === key)?.type).toBe("number");
    }
  });
});

describe("the research category", () => {
  test("research is a first-class category with its own preset", () => {
    expect(CATEGORY_ORDER).toContain("research");
    expect(CATEGORY_LABELS.research).toBe("Research");
    // Pin the actual field keys, in order. The weaker "non-empty and not
    // invoiceNumber" check this replaced would have passed for ANY wrong preset
    // — handing `research` a copy of claims' rows, say — and the missing-entry
    // case it appeared to guard is already a tsc failure, because PRESETS is a
    // total Record<CategoryId, PresetRow[]>. Update this list deliberately if
    // the preset changes; that is the point of pinning it.
    expect(presetFor("research").map((r) => r.key)).toEqual([
      "title",
      "authors",
      "abstract",
      "sectionCount",
    ]);
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

// Why an allowlist and not a count: PRESETS.handwriting shipped `writtenDate`
// and `primaryName` on 2026-08-11, both guessed — no document carries a
// document-authorship date, and only the employment application names one
// person. Nothing in this suite caught it, because the only thing checking
// handwriting's rows was the generic cross-category loop above (key format,
// type, non-empty description), which a guessed field satisfies just as
// easily as a grounded one. A count assertion would not have caught it
// either: it passes the moment someone adds a field and updates the number,
// which is bookkeeping, not a guard.
//
// Pairing each field name with the source quote that grounds it means adding
// a field here requires writing down a quote that does not exist — the
// review step that was missing the first time. See categories.ts's
// `handwriting` preset comment for the full per-document grounding; this map
// only needs enough of the quote to make a reviewer go check.
const GROUNDED_HANDWRITING_FIELDS: Record<string, string> = {
  documentTitle:
    'headed by content on three of four ("Apricot Cake." / "Heavenly Hamburgers" / "Employment Application"); the fourth ("NOTES") is only the stationery\'s pre-printed header, not a title written for that note',
};

// Same guard, for the construction preset that replaced the westbridge
// submittal-form fields on 2026-08-12 (SDK-051). Quotes are shorthand for the
// full `source` strings in lib/verified.ts — for projectName, projectNumber
// and applicationNumber those are a field box's printed label and its value
// (e.g. "PROJECT" above "Cedar Hollow…"), read together and joined with a
// space, not literally one line straight off the page.
const GROUNDED_CONSTRUCTION_FIELDS: Record<string, string> = {
  projectName: '"PROJECT Cedar Hollow Family Health Center..."',
  projectNumber: '"PROJECT NO. 24-118"',
  applicationNumber: '"APPLICATION NO. 14"',
  contractSumToDate: '"CONTRACT SUM TO DATE (Line 1 +/- 2) $5,036,400.00"',
  retainage: '"Total Retainage $197,455.00"',
  currentPaymentDue: '"CURRENT PAYMENT DUE $456,665.00"',
};

describe("guidance presets", () => {
  test("the invoices guidance preset carries the verified string", () => {
    // Verified over nineteen hosted runs on 2026-08-12: without it, Bedrock
    // Qwen3-VL returns 1,910,500 (Revised Contract) instead of 345,015 on
    // Invoice AC-2025-1047. OpenAI and Claude are correct either way, and the
    // other studio invoices are unchanged by it. Rewording invalidates all of it.
    const [preset] = guidanceFor("invoices");
    expect(preset.text).toContain("Amount Due");
    expect(preset.text).toContain("retainage");
  });

  test("a category with no guidance gets an empty list", () => {
    expect(guidanceFor("logistics")).toEqual([]);
    expect(guidanceFor("uncategorized")).toEqual([]);
  });
});

describe("the handwriting preset is grounded, not guessed", () => {
  test("every field in the preset has a grounding entry", () => {
    const keys = presetFor("handwriting").map((r) => r.key);
    for (const key of keys) {
      expect(Object.keys(GROUNDED_HANDWRITING_FIELDS)).toContain(key);
    }
  });

  test("every grounding entry is for a field the preset actually has", () => {
    // The reverse direction: a stale entry left behind after a field is
    // removed would let the map claim more grounding than the preset ships,
    // silently. Keeping the map exactly in sync means it is honest evidence
    // about what's live, not an append-only log.
    const keys = new Set(presetFor("handwriting").map((r) => r.key));
    for (const groundedKey of Object.keys(GROUNDED_HANDWRITING_FIELDS)) {
      expect(keys.has(groundedKey)).toBe(true);
    }
  });
});

describe("the construction preset is grounded, not guessed", () => {
  test("every field in the preset has a grounding entry", () => {
    const keys = presetFor("construction").map((r) => r.key);
    for (const key of keys) {
      expect(Object.keys(GROUNDED_CONSTRUCTION_FIELDS)).toContain(key);
    }
  });

  test("every grounding entry is for a field the preset actually has", () => {
    const keys = new Set(presetFor("construction").map((r) => r.key));
    for (const groundedKey of Object.keys(GROUNDED_CONSTRUCTION_FIELDS)) {
      expect(keys.has(groundedKey)).toBe(true);
    }
  });
});
