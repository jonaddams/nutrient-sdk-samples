import type { VerifiedValue } from "./verified";

export type Verdict = "match" | "mismatch" | "unverified";

/** Absorbs float representation noise without hiding a real difference. */
const NUMBER_TOLERANCE = 0.01;

/** Currency symbols, thousands separators and spaces, stripped before parsing. */
function toNumber(input: unknown): number | null {
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  const cleaned = input.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normaliseText(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

/** An instant, only when the text is date-shaped enough to be unambiguous. */
function toDate(input: string): number | null {
  // Requires a 4-digit year somewhere: Date.parse("88.06") succeeds in some
  // engines, and a silent date interpretation of a number would be worse than
  // no comparison at all.
  const trimmed = input.trim();
  if (!/\d{4}/.test(trimmed)) return null;

  // Bare ISO dates ("2022-11-16") parse as UTC midnight, while every other
  // format ("November 16, 2022") parses as local midnight in V8/Node. Outside
  // UTC those two instants differ by the zone offset, so the *same calendar
  // day* would wrongly compare as a mismatch. Build the ISO case as a local
  // date explicitly so both forms land on the same instant.
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const t = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
    return Number.isNaN(t) ? null : t;
  }

  const t = Date.parse(trimmed);
  return Number.isNaN(t) ? null : t;
}

/**
 * The verdict for one extracted field.
 *
 * Biased toward "unverified" by design: every "mismatch" is a public claim that
 * the SDK got something wrong, shown to a prospect. When the comparison cannot
 * be made confidently — no key, or an unparseable input where a key exists —
 * say nothing rather than accuse. That bias stops at genuine AMBIGUITY, though:
 * it does not cover a field that HAS a verified answer and simply got no value.
 *
 * Jon's ruling, 2026-08-12: a verified field with nothing extracted is a
 * "mismatch", not "unverified". The two situations "unverified" used to
 * conflate — "no answer key exists" and "an answer key exists but the model
 * said nothing" — are not the same thing for a scoreboard. Scoring the second
 * one as "unverified" made declining to answer improve a provider's score,
 * which is backwards: to a buyer, "didn't answer" and "answered wrong" both
 * mean a human still has to go check. Do not extend this to the ambiguous
 * cases below (unparseable number, etc.) — the unverified bias still governs
 * there, unweakened.
 */
export function compareField(
  extracted: unknown,
  verified: VerifiedValue | null,
  type: string,
): Verdict {
  if (verified == null) return "unverified";
  if (extracted == null || extracted === "") return "mismatch";

  if (type === "number") {
    const a = toNumber(extracted);
    const b = toNumber(verified.value);
    if (a === null || b === null) return "unverified";
    return Math.abs(a - b) <= NUMBER_TOLERANCE ? "match" : "mismatch";
  }

  if (type === "boolean") {
    const norm = (x: unknown) =>
      typeof x === "boolean" ? x : normaliseText(String(x)) === "true";
    return norm(extracted) === norm(verified.value) ? "match" : "mismatch";
  }

  const a = String(extracted);
  const b = String(verified.value);

  // Dates first: "2022-11-16" and "November 16, 2022" are the same answer, and
  // a string comparison would call that a mismatch. Only when BOTH sides parse
  // — otherwise the fallback below is the honest comparison.
  const da = toDate(a);
  const db = toDate(b);
  if (da !== null && db !== null) return da === db ? "match" : "mismatch";

  return normaliseText(a) === normaliseText(b) ? "match" : "mismatch";
}

/** Counts for the run summary. `verified` excludes unverified fields, so the
 *  summary never implies a score for fields with no answer key. */
export function summarise(verdicts: Verdict[]): {
  matched: number;
  verified: number;
} {
  let matched = 0;
  let verified = 0;
  for (const v of verdicts) {
    if (v === "unverified") continue;
    verified += 1;
    if (v === "match") matched += 1;
  }
  return { matched, verified };
}
