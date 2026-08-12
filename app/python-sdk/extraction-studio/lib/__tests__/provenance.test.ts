import { expect, test } from "vitest";
import { engineLabel, languagesLabel, providerLabel } from "../provenance";

test("both provider vocabularies resolve to the same label", () => {
  // The studio says "anthropic"; /tables, /describe and /vlm say "claude". A
  // results panel that showed one or the other would expose that seam, and
  // which one it got depends on which endpoint the feature calls.
  expect(providerLabel("anthropic")).toBe("Claude");
  expect(providerLabel("claude")).toBe("Claude");
  expect(providerLabel("openai")).toBe("OpenAI");
  expect(providerLabel("bedrock")).toBe("AWS Bedrock");
  expect(providerLabel("local")).toBe("Local model");
});

test("an unlabelled provider shows its raw id rather than disappearing", () => {
  // Hiding it would make the provenance line lie by omission, which is the
  // failure this module exists to fix.
  expect(providerLabel("mistral")).toBe("mistral");
});

test("no provider means no line, not an empty one", () => {
  expect(providerLabel(undefined)).toBeNull();
  expect(providerLabel("")).toBeNull();
});

test("engine labels key on the backend's engine, not the studio's request id", () => {
  // "ICR"/"VLM" come back on the result; "local"/"vlm" are what the config
  // panel sends. Keying on the result is what makes the label describe the run
  // on screen rather than the toggle's current position.
  expect(engineLabel("ICR")).toBe("Local ICR");
  expect(engineLabel("VLM")).toBe("VLM-enhanced");
  expect(engineLabel(undefined)).toBeNull();
});

test("multi-language codes are spaced, keeping the SDK's own separator", () => {
  // The '+' is load-bearing — a comma or a space makes the SDK return an empty
  // document silently — so it is shown, not swapped for a comma.
  expect(languagesLabel("eng+deu+fra")).toBe("eng + deu + fra");
  expect(languagesLabel("eng")).toBe("eng");
  expect(languagesLabel(undefined)).toBeNull();
});
