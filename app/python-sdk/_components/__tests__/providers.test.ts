import { describe, expect, it } from "vitest";
import {
  assembleOutcomes,
  formatTiming,
  type Outcomes,
  outcomeEntries,
  PROVIDER_LABELS,
  providersFor,
} from "../providers";

describe("providersFor", () => {
  it("returns a single provider for single modes", () => {
    expect(providersFor("claude")).toEqual(["claude"]);
    expect(providersFor("openai")).toEqual(["openai"]);
  });
  it("returns claude then openai for both", () => {
    expect(providersFor("both")).toEqual(["claude", "openai"]);
  });
  it("returns a fresh array each call (no shared mutable state)", () => {
    const a = providersFor("both");
    a.pop();
    expect(providersFor("both")).toEqual(["claude", "openai"]);
  });
});

describe("assembleOutcomes", () => {
  it("maps fulfilled results to ok outcomes with timing", () => {
    const out = assembleOutcomes<string>(
      ["claude"],
      [{ status: "fulfilled", value: { data: "hi", ms: 1234.5 } }],
    );
    expect(out.claude).toEqual({ status: "ok", data: "hi", ms: 1234.5 });
  });
  it("maps rejected results to error outcomes with the Error message", () => {
    const out = assembleOutcomes<string>(
      ["openai"],
      [{ status: "rejected", reason: new Error("boom") }],
    );
    expect(out.openai).toEqual({ status: "error", message: "boom" });
  });
  it("stringifies non-Error rejection reasons", () => {
    const out = assembleOutcomes<string>(
      ["claude"],
      [{ status: "rejected", reason: "raw string" }],
    );
    expect(out.claude).toEqual({ status: "error", message: "raw string" });
  });
  it("keys mixed outcomes by provider position", () => {
    const out = assembleOutcomes<number>(
      ["claude", "openai"],
      [
        { status: "fulfilled", value: { data: 42, ms: 100 } },
        { status: "rejected", reason: new Error("nope") },
      ],
    );
    expect(out.claude).toEqual({ status: "ok", data: 42, ms: 100 });
    expect(out.openai).toEqual({ status: "error", message: "nope" });
  });
});

describe("outcomeEntries", () => {
  it("returns entries in claude-first order regardless of insertion order", () => {
    const o: Outcomes<number> = {
      openai: { status: "ok", data: 2, ms: 1 },
      claude: { status: "ok", data: 1, ms: 1 },
    };
    expect(outcomeEntries(o).map(([p]) => p)).toEqual(["claude", "openai"]);
  });
  it("omits providers with no outcome", () => {
    const o: Outcomes<number> = { openai: { status: "ok", data: 2, ms: 1 } };
    expect(outcomeEntries(o).map(([p]) => p)).toEqual(["openai"]);
  });
  it("returns empty for empty outcomes", () => {
    expect(outcomeEntries({})).toEqual([]);
  });
});

describe("formatTiming", () => {
  it("formats milliseconds as one-decimal seconds", () => {
    expect(formatTiming(4234)).toBe("4.2s");
    expect(formatTiming(950)).toBe("1.0s");
    expect(formatTiming(60)).toBe("0.1s");
  });
});

describe("PROVIDER_LABELS", () => {
  it("has display labels for both providers", () => {
    expect(PROVIDER_LABELS.claude).toBe("Claude");
    expect(PROVIDER_LABELS.openai).toBe("OpenAI");
  });
});
