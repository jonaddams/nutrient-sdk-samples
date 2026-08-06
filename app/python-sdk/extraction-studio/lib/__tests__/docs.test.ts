import { describe, expect, test } from "vitest";
import { DOCUMENTS, findDoc } from "../docs";

describe("the document manifest", () => {
  test("every entry is fully populated", () => {
    for (const d of DOCUMENTS) {
      expect(d.docId).toBeTruthy();
      expect(d.label).toBeTruthy();
      expect(d.filename).toMatch(/\.pdf$/);
      expect(typeof d.hasTextLayer).toBe("boolean");
    }
  });

  test("docIds are unique", () => {
    const ids = DOCUMENTS.map((d) => d.docId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("paths are unique — the same PDF must not appear twice", () => {
    // Two of the original nine documents were byte-identical duplicates of
    // others. This is the guard against reintroducing that.
    const paths = DOCUMENTS.map((d) => d.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test("every path is an absolute public URL", () => {
    // A relative path would resolve against the current route, not public/.
    for (const d of DOCUMENTS) {
      expect(d.path.startsWith("/")).toBe(true);
    }
  });

  test("covers a mix of text-layer and scanned documents", () => {
    // The demo's point is that both paths work; a manifest of only one kind
    // would silently stop exercising OCR.
    const kinds = new Set(DOCUMENTS.map((d) => d.hasTextLayer));
    expect(kinds.size).toBe(2);
  });

  test("no label restates its own category", () => {
    // The rail shows the category control directly above this list, so repeating
    // the category word in the label spends the 208px column on something the
    // user just picked. Invoice labels dropped "invoice" in #44; Claims dropped
    // "claim" on 2026-08-06. This is the rule behind both, so a new document
    // cannot quietly reintroduce the redundancy.
    //
    // Singularised crudely on purpose — "invoices" -> "invoice" is all the
    // categories need, and a real inflector would be more machinery than the
    // rule deserves.
    for (const d of DOCUMENTS) {
      const noun = d.category.replace(/s$/, "");
      expect(d.label.toLowerCase()).not.toContain(noun);
    }
  });

  test("no label names a property instead of the document", () => {
    // "Scanned" used to be a label, which made one document read as a category
    // while its neighbours read as names — and it was misleading besides, since
    // three other documents are scans too. Scan-ness is DocStrip's job now.
    const properties = ["scanned", "scan", "text layer", "ocr"];
    for (const d of DOCUMENTS) {
      for (const prop of properties) {
        expect(d.label.toLowerCase()).not.toBe(prop);
      }
    }
  });

  test("the duplicate documents are absent", () => {
    const ids = DOCUMENTS.map((d) => d.docId);
    expect(ids).not.toContain("construction");
    expect(ids).not.toContain("accident-report");
  });

  test("findDoc resolves a known id and returns undefined otherwise", () => {
    expect(findDoc("bill-of-lading")?.filename).toBe("bill-of-lading.pdf");
    expect(findDoc("nope")).toBeUndefined();
  });
});
