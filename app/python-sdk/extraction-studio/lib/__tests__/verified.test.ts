import { describe, expect, test } from "vitest";
import { presetFor } from "../categories";
import { DOCUMENTS, findDoc } from "../docs";
import { VERIFIED, verifiedFor } from "../verified";

describe("answer key", () => {
  test("every docId in the key is a real document", () => {
    for (const docId of Object.keys(VERIFIED)) {
      expect(findDoc(docId), `unknown docId: ${docId}`).toBeDefined();
    }
  });

  test("every field in the key is a preset field of that document's category", () => {
    for (const [docId, fields] of Object.entries(VERIFIED)) {
      const doc = findDoc(docId);
      if (!doc) continue;
      const known = new Set(presetFor(doc.category).map((p) => p.key));
      for (const name of Object.keys(fields)) {
        expect(known.has(name), `${docId}.${name} is not a preset field`).toBe(
          true,
        );
      }
    }
  });

  test("every value carries a non-empty source quote", () => {
    // The quote is what makes the "verified" label true: it is the evidence a
    // reviewer confirmed, and what a later session reads instead of re-deriving.
    for (const fields of Object.values(VERIFIED)) {
      for (const v of Object.values(fields)) {
        expect(String(v.value).length).toBeGreaterThan(0);
        expect(v.source.trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("verifiedFor returns null for an unknown document or field", () => {
    expect(verifiedFor("no-such-doc", "totalAmount")).toBeNull();
    expect(verifiedFor(DOCUMENTS[0].docId, "noSuchField")).toBeNull();
  });

  test("the known-hard cases are pinned", () => {
    // lumen-invoice prints BOTH "Invoice Date November 16, 2022" and "Payment
    // Due December 16, 2022". The schema asks for issueDate. Claude and Bedrock
    // both return the due date; only OpenAI is correct. Measured 2026-08-12.
    expect(verifiedFor("lumen-invoice", "issueDate")?.value).toBe(
      "November 16, 2022",
    );
    // Retainage: the Revised Contract value 1,910,500 is printed on the same page.
    expect(verifiedFor("invoice-ac20251047", "totalAmount")?.value).toBe(
      345015,
    );
  });
});
