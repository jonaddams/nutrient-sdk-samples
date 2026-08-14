import { describe, expect, it, test } from "vitest";
import type { VerifiedValue } from "../verified";
import { compareField, summarise } from "../verify";
import goldenCases from "./fixtures/golden-cases.json";

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

describe("ambiguous decimal/thousands grouping", () => {
  // scanned-invoice is the corpus's one European document (answer key:
  // totalAmount 1165.10). "1,165.10" (comma=thousands, dot=decimal — US) is
  // unambiguous and must keep parsing. "1.165,10" (dot=thousands,
  // comma=decimal — European) is NOT unparseable — Number() happily returns
  // a finite (wrong) value for it once the comma is naively stripped — so the
  // "unparseable -> unverified" guard alone cannot catch it. Refusing to
  // guess the convention is the fix: "unverified", not a confident wrong
  // number.
  test("US grouping is unambiguous and still matches", () => {
    expect(compareField("1,165.10", v(1165.1), "number")).toBe("match");
  });
  test("European grouping is ambiguous, not wrong — unverified", () => {
    expect(compareField("1.165,10", v(1165.1), "number")).toBe("unverified");
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

  // Every pair below was confirmed on this corpus, 2026-08-12: same answer,
  // different typography, previously graded as a public "mismatch" ✗. The
  // answer key itself declines to grade two fields for exactly this reason
  // (verified.ts scanned-invoice / emergency-dept-billing-worksheet), so the
  // comparator must not hold extractions to a stricter standard than that.
  test("a trailing sentence period is not a difference", () => {
    expect(compareField("Apricot Cake", v("Apricot Cake."), "string")).toBe(
      "match",
    );
  });
  test("a suffix comma (', LLC') is not a difference", () => {
    expect(
      compareField(
        "Keystone Construction Group LLC",
        v("Keystone Construction Group, LLC"),
        "string",
      ),
    ).toBe("match");
  });
  test("a middle initial's period is not a difference", () => {
    expect(
      compareField("Daniel R Whitfield", v("Daniel R. Whitfield"), "string"),
    ).toBe("match");
  });
  test("a trailing abbreviation period ('Ltd.') is not a difference", () => {
    expect(
      compareField(
        "Apex Industrial Supply Ltd",
        v("Apex Industrial Supply Ltd."),
        "string",
      ),
    ).toBe("match");
  });
  test("hyphen vs. em dash is not a difference", () => {
    expect(
      compareField(
        "08 51 13 - Aluminum Windows",
        v("08 51 13 — Aluminum Windows"),
        "string",
      ),
    ).toBe("match");
  });
});

describe("dates", () => {
  // lumen-invoice, measured 2026-08-12: OpenAI returned the printed form,
  // Claude the wrong date, Bedrock the wrong date in ISO. All three must be
  // judged correctly, and the format difference must not decide the verdict.
  //
  // IMPORTANT: this whole describe block must be run under a non-UTC TZ to
  // mean anything. `2022-11-16` parses as UTC midnight; every other format
  // parses as *local* midnight in V8/Node — outside UTC those are different
  // instants, and a UTC-only test run cannot see that class of bug (it has
  // bitten this project three times). CI and `pnpm test` inherit whatever TZ
  // the shell has; verify by hand with e.g.:
  //   TZ=America/New_York pnpm exec vitest run lib/__tests__/verify.test.ts
  //   TZ=Asia/Tokyo pnpm exec vitest run lib/__tests__/verify.test.ts
  //   TZ=UTC pnpm exec vitest run lib/__tests__/verify.test.ts
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

  // A provider that normalises to RFC3339 ("2022-11-16T00:00:00Z") emits a
  // UTC instant. Before the fix, that fell through the ISO fast path (which
  // only matched a bare YYYY-MM-DD) to Date.parse, which honours the "Z" —
  // and compared it against a local-midnight reading of the same calendar
  // day. Outside UTC, that is a guaranteed false "mismatch" on a date the
  // model got right. Measured directly, TZ=America/New_York, before the fix:
  //   compareField("2022-11-16T00:00:00Z", issued, "string") -> "mismatch"
  // All three must be "match" now, in every timezone.
  describe("an RFC3339 instant is still the same calendar day", () => {
    test("against the printed form", () => {
      expect(compareField("2022-11-16T00:00:00Z", issued, "string")).toBe(
        "match",
      );
    });
    test("against the bare ISO form", () => {
      expect(
        compareField("2022-11-16T00:00:00Z", v("2022-11-16"), "string"),
      ).toBe("match");
    });
    test("the bare ISO form against the printed form (already handled)", () => {
      expect(compareField("2022-11-16", issued, "string")).toBe("match");
    });
    test("a genuinely different day, in RFC3339, is still a mismatch", () => {
      expect(compareField("2022-12-16T00:00:00Z", issued, "string")).toBe(
        "mismatch",
      );
    });
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

describe("golden cases (shared with the Python port)", () => {
  // This fixture is the ONLY thing keeping the TypeScript comparator and the
  // Python one in the extraction-cost tool from drifting apart. If you change a
  // case here, change it in that repository's copy in the same change — the
  // hash test on the other side exists to make forgetting loud.
  it.each(goldenCases.cases)("$name", ({ extracted, verified, type, expected }) => {
    expect(compareField(extracted, verified, type)).toBe(expected);
  });
});
