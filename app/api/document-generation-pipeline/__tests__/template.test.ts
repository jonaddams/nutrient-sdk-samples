import { describe, expect, it } from "vitest";
import { DEFAULT_VALUES, mergeTemplate, SIGNERS } from "../template";

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

  it("contains every signer anchor token exactly once", () => {
    const html = mergeTemplate(DEFAULT_VALUES);
    for (const signer of SIGNERS) {
      const matches = html.split(signer.token).length - 1;
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

  it("ships two signers with underscore-free uppercase tokens", () => {
    expect(SIGNERS).toHaveLength(2);
    for (const s of SIGNERS) {
      expect(s.token).toMatch(/^[A-Z0-9]+$/);
    }
  });
});
