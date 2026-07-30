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
