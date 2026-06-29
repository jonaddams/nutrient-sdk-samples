import { describe, expect, it } from "vitest";
import {
  DEFAULT_VALUES,
  FORM_FIELDS,
  mergeTemplate,
} from "../contract-template";

describe("mergeTemplate", () => {
  it("interpolates merge values into the HTML", () => {
    const html = mergeTemplate({
      clientName: "Globex Inc",
      providerName: "Initech LLC",
      feePerMonth: "7,500",
      effectiveDate: "March 3, 2026",
    });
    expect(html).toContain("Globex Inc");
    expect(html).toContain("Initech LLC");
    expect(html).toContain("7,500");
    expect(html).toContain("March 3, 2026");
  });

  it("contains every form-field anchor token exactly once", () => {
    const html = mergeTemplate(DEFAULT_VALUES);
    for (const spec of FORM_FIELDS) {
      const matches = html.split(spec.token).length - 1;
      expect(matches).toBe(1);
    }
  });

  it("HTML-escapes user-supplied values", () => {
    const html = mergeTemplate({
      ...DEFAULT_VALUES,
      clientName: "<script>x</script>",
    });
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
  });

  it("ships date + signature fields with underscore-free uppercase tokens", () => {
    expect(FORM_FIELDS).toHaveLength(4);
    for (const f of FORM_FIELDS) {
      expect(f.token).toMatch(/^[A-Z0-9]+$/);
    }
    expect(FORM_FIELDS.filter((f) => f.type === "signature")).toHaveLength(2);
    expect(FORM_FIELDS.filter((f) => f.type === "text")).toHaveLength(2);
  });
});
