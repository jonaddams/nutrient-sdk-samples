import { describe, expect, test } from "vitest";
import type { VerifiedValue } from "../verified";
import { compareField, summarise } from "../verify";

const v = (value: string | number): VerifiedValue => ({ value, source: "x" });

describe("unverified beats mismatch", () => {
  // The governing rule: every mismatch is a public accusation that the SDK got
  // something wrong. When the comparison cannot be made confidently, say nothing.
  test("no key at all", () => {
    expect(compareField(345015, null, "number")).toBe("unverified");
  });
  test("no key at all, and nothing extracted either — the bias still protects this", () => {
    // The case "unverified" exists for: there is no answer to be wrong about,
    // regardless of whether anything was extracted.
    expect(compareField(null, null, "number")).toBe("unverified");
  });
  test("a number field whose extracted value will not parse", () => {
    expect(compareField("n/a", v(345015), "number")).toBe("unverified");
  });
});

describe("a verified field with nothing extracted is a mismatch", () => {
  // Jon's ruling, 2026-08-12: this used to be "unverified" (see git history),
  // which meant declining to answer a field that DOES have a verified answer
  // scored BETTER than answering it wrong — backwards for a scoreboard. Do
  // not revert this to "unverified": the case that bias still protects is the
  // one directly above (no key at all), not this one.
  test("nothing extracted, but a verified answer exists", () => {
    expect(compareField(null, v(345015), "number")).toBe("mismatch");
  });
  test("an empty string counts the same as nothing extracted", () => {
    expect(compareField("", v(345015), "number")).toBe("mismatch");
  });
});

describe("numbers", () => {
  // Every one of these formats was returned by a real provider on 2026-08-12.
  test.each([
    345015,
    345015.0,
    "345015",
    "345,015",
    "$345,015.00",
    " 345015 ",
  ])("%s matches 345015", (extracted) => {
    expect(compareField(extracted, v(345015), "number")).toBe("match");
  });
  test("the retainage miss is a mismatch", () => {
    expect(compareField(1910500, v(345015), "number")).toBe("mismatch");
  });
  test("tolerance absorbs float noise but not a real difference", () => {
    expect(compareField(88.061, v(88.06), "number")).toBe("match");
    expect(compareField(88.5, v(88.06), "number")).toBe("mismatch");
  });
});

describe("booleans", () => {
  // VerifiedValue.value is typed string | number, never boolean, so a real
  // boolean answer key is stored as the strings "true"/"false" — the
  // string-form case below is the one that actually occurs in the corpus.
  test("boolean values that agree are a match", () => {
    expect(compareField(true, v("true"), "boolean")).toBe("match");
  });
  test("boolean values that disagree are a mismatch", () => {
    expect(compareField(true, v("false"), "boolean")).toBe("mismatch");
  });
  test("string-form booleans compare the same way", () => {
    expect(compareField("true", v("true"), "boolean")).toBe("match");
    expect(compareField("false", v("true"), "boolean")).toBe("mismatch");
  });
});

describe("strings", () => {
  test("case and whitespace are not differences", () => {
    expect(compareField("  ac-2025-1047 ", v("AC-2025-1047"), "string")).toBe(
      "match",
    );
  });
  test("a genuinely different string is a mismatch", () => {
    expect(compareField("AC-2025-9999", v("AC-2025-1047"), "string")).toBe(
      "mismatch",
    );
  });
});

describe("dates", () => {
  // lumen-invoice, measured 2026-08-12: OpenAI returned the printed form,
  // Claude the wrong date, Bedrock the wrong date in ISO. All three must be
  // judged correctly, and the format difference must not decide the verdict.
  const issued = v("November 16, 2022");
  test("same date, printed form", () => {
    expect(compareField("November 16, 2022", issued, "string")).toBe("match");
  });
  test("same date, ISO form", () => {
    expect(compareField("2022-11-16", issued, "string")).toBe("match");
  });
  test("the payment-due date is a mismatch, not a format difference", () => {
    expect(compareField("December 16, 2022", issued, "string")).toBe(
      "mismatch",
    );
    expect(compareField("2022-12-16", issued, "string")).toBe("mismatch");
  });
  test("unparseable text against a date falls back to string comparison", () => {
    expect(compareField("sometime in November", issued, "string")).toBe(
      "mismatch",
    );
  });
});

describe("summarise", () => {
  test("unverified fields are excluded from the denominator", () => {
    expect(summarise(["match", "match", "mismatch", "unverified"])).toEqual({
      matched: 2,
      verified: 3,
    });
  });
  test("all unverified is an empty summary, not a zero score", () => {
    expect(summarise(["unverified", "unverified"])).toEqual({
      matched: 0,
      verified: 0,
    });
  });
});
