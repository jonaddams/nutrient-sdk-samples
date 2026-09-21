import { describe, expect, it } from "vitest";
import { parseAuthResults, senderIsAuthentic } from "../_lib/auth-results";

/**
 * With the sender allowlist opened to a whole company so colleagues can demo,
 * `From` matching alone is a naming convention rather than a control — anyone who
 * learns the inbound address can claim to be at that domain. These checks are
 * what make the allowlist mean something.
 */

const PASS =
  "mx.resend.com; spf=pass smtp.mailfrom=nutrient.io; dkim=pass header.d=nutrient.io; dmarc=pass header.from=nutrient.io";
const SPOOFED =
  "mx.resend.com; spf=fail smtp.mailfrom=attacker.example; dkim=fail; dmarc=fail header.from=nutrient.io";

describe("parseAuthResults", () => {
  it("reads verdicts from a record of headers", () => {
    const a = parseAuthResults({ "Authentication-Results": PASS });
    expect(a).toMatchObject({ dmarc: "pass", spf: "pass", dkim: "pass" });
  });

  it("is case-insensitive about the header name", () => {
    expect(parseAuthResults({ "authentication-results": PASS }).dmarc).toBe(
      "pass",
    );
  });

  it("reads an array of {name,value} headers", () => {
    const a = parseAuthResults([
      { name: "From", value: "jon@nutrient.io" },
      { name: "Authentication-Results", value: PASS },
    ]);
    expect(a.dmarc).toBe("pass");
  });

  it("reads an array of raw header lines", () => {
    const a = parseAuthResults([`Authentication-Results: ${PASS}`]);
    expect(a.dmarc).toBe("pass");
  });

  it("treats a non-pass verdict as fail, not unknown", () => {
    // "softfail", "temperror", "none" are all not-a-pass.
    const a = parseAuthResults({
      "Authentication-Results": "spf=softfail; dmarc=none",
    });
    expect(a.spf).toBe("fail");
    expect(a.dmarc).toBe("fail");
  });

  it("returns unknown when the header is absent", () => {
    expect(parseAuthResults({ From: "x@y.example" })).toMatchObject({
      dmarc: "unknown",
      raw: null,
    });
  });

  it("survives null and undefined", () => {
    expect(parseAuthResults(null).dmarc).toBe("unknown");
    expect(parseAuthResults(undefined).dmarc).toBe("unknown");
  });
});

describe("senderIsAuthentic", () => {
  it("accepts a DMARC pass", () => {
    expect(
      senderIsAuthentic(parseAuthResults({ "Authentication-Results": PASS })),
    ).toMatchObject({ ok: true, verified: true });
  });

  it("REFUSES a spoofed sender", () => {
    // The case the whole module exists for: `From` says nutrient.io, the domain
    // owner's records say otherwise.
    const v = senderIsAuthentic(
      parseAuthResults({ "Authentication-Results": SPOOFED }),
    );
    expect(v.ok).toBe(false);
    expect(v.reason).toBe("dmarc_fail");
  });

  it("accepts when SPF passes even with no DMARC verdict", () => {
    const a = parseAuthResults({
      "Authentication-Results": "spf=pass smtp.mailfrom=nutrient.io",
    });
    expect(senderIsAuthentic(a)).toMatchObject({ ok: true, verified: true });
  });

  it("refuses when both SPF and DKIM fail and DMARC is silent", () => {
    const a = parseAuthResults({
      "Authentication-Results": "spf=fail; dkim=fail",
    });
    expect(senderIsAuthentic(a)).toMatchObject({
      ok: false,
      reason: "spf_and_dkim_fail",
    });
  });

  it("fails OPEN when nothing can be determined, but marks it unverified", () => {
    // Deliberate: a missing or differently-shaped header must not reject every
    // email. The message is accepted and carries a `sender_unverified` flag, with
    // the hourly cap bounding what that can cost.
    const v = senderIsAuthentic(parseAuthResults(null));
    expect(v.ok).toBe(true);
    expect(v.verified).toBe(false);
  });
});
