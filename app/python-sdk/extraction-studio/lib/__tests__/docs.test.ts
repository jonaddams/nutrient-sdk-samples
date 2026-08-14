import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, test } from "vitest";
import { DOCUMENTS, findDoc } from "../docs";

describe("the document manifest", () => {
  test("every entry is fully populated", () => {
    for (const d of DOCUMENTS) {
      expect(d.docId).toBeTruthy();
      expect(d.label).toBeTruthy();
      // Was `/\.pdf$/` until the handwriting category added four plain images
      // (no PDF wrapper) — the manifest was never actually PDF-only, that was
      // just true of every document until 2026-08-11. Widened again on
      // 2026-08-13 for the multilingual category's PNG book-spread scan —
      // same reasoning, a new legitimate image format, not a loosened check.
      expect(d.filename).toMatch(/\.(pdf|jpe?g|png)$/);
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

  it("offers the research paper, the only document with real document structure", () => {
    const paper = DOCUMENTS.find((d) => d.docId === "usenix-example-paper");
    expect(paper).toBeDefined();
    expect(paper?.category).toBe("research");
    expect(paper?.hasTextLayer).toBe(true);
    // Shared with app/python-sdk/markdown-extraction, which references this
    // same path. Do not duplicate the file.
    expect(paper?.path).toBe("/documents/usenix-example-paper.pdf");
  });

  it("offers the bilingual book spread, the only document Multilingual OCR can demonstrate", () => {
    const spread = DOCUMENTS.find((d) => d.docId === "ocr-multiple-languages");
    expect(spread).toBeDefined();
    expect(spread?.category).toBe("multilingual");
    // A PNG with no text layer at all — Adaptive/Multilingual OCR is the only
    // thing that can read it.
    expect(spread?.hasTextLayer).toBe(false);
    // Shared with app/python-sdk/ocr-extraction, which references this same
    // path. Do not duplicate the file.
    expect(spread?.path).toBe("/documents/input_ocr_multiple_languages.png");
  });
});

describe("the handwriting category", () => {
  // Added 2026-08-11 alongside the four handwriting documents themselves. All
  // ten prior documents are printed business PDFs, so Describe's "Transcribe"
  // preset had nothing to prove; these four images are what makes it
  // demonstrate something.
  const handwriting = DOCUMENTS.filter((d) => d.category === "handwriting");

  test("has exactly four documents", () => {
    expect(handwriting).toHaveLength(4);
  });

  test("none of the four have a text layer — they are plain images", () => {
    for (const d of handwriting) {
      expect(d.hasTextLayer).toBe(false);
    }
  });

  test("every path resolves to a file that actually exists under public/", () => {
    // vitest runs from the repo root (confirmed: process.cwd() here is the
    // project root, not this test file's directory), so `public` + d.path is
    // the real on-disk location Next serves the file from. This test only
    // covers the four handwriting documents, not the whole manifest, in case
    // fixtures for the other categories are ever moved without this file's
    // notice — that risk isn't new here.
    for (const d of handwriting) {
      expect(existsSync(join(process.cwd(), "public", d.path))).toBe(true);
    }
  });

  test("the four documents are exactly the expected files", () => {
    const filenames = handwriting.map((d) => d.filename).sort();
    expect(filenames).toEqual(
      [
        "handwritten-cursive-apricot-cake-recipe.jpg",
        "handwritten-cursive-dear-magnus-thank-you-note.jpg",
        "handwritten-employment-application.jpg",
        "heavenly-hamburgers-recipe.jpeg",
      ].sort(),
    );
  });

  test("DOCUMENTS[0] is unchanged — the default demo document did not move", () => {
    // Appending handwriting at the end must not disturb the document the
    // studio loads by default.
    expect(DOCUMENTS[0].docId).toBe("invoice-ac20251047");
  });
});
