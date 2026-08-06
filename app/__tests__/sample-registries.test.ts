import { describe, expect, test } from "vitest";
import { samples as aiDocumentProcessing } from "../ai-document-processing/samples";
import { samples as api } from "../api/samples";
import { samples as documentAuthoringSdk } from "../document-authoring-sdk/samples";
import { samples as dotnetSdk } from "../dotnet-sdk/samples";
import { samples as javaSdk } from "../java-sdk/samples";
import { samples as pythonSdk } from "../python-sdk/samples";
import { samples as webSdk } from "../web-sdk/samples";

/**
 * These exist because the landing page's headline counts had rotted badly.
 *
 * They used to live in prose (`foot: "33 samples"`) with the total regex-parsed
 * back out of those strings, so nothing derived from the registries and nothing
 * failed when they diverged — by 2026-08-06 the front door claimed 57 samples
 * against 76 actual. app/page.tsx now derives both the per-SDK footer and the
 * total from these arrays, which makes that particular drift impossible.
 *
 * What is still worth pinning is everything the type system does not catch: a
 * path that does not match its own SDK, a duplicate route, an empty registry.
 */
const REGISTRIES = {
  "web-sdk": webSdk,
  "python-sdk": pythonSdk,
  "java-sdk": javaSdk,
  "dotnet-sdk": dotnetSdk,
  "document-authoring-sdk": documentAuthoringSdk,
  api,
  "ai-document-processing": aiDocumentProcessing,
} as const;

describe.each(Object.entries(REGISTRIES))("%s registry", (sdk, samples) => {
  test("is not empty", () => {
    // An empty registry would silently render "0 samples" on the landing page
    // rather than failing, now that the count is derived.
    expect(samples.length).toBeGreaterThan(0);
  });

  test("every sample has a name, category, description and path", () => {
    for (const s of samples) {
      expect(s.name).toBeTruthy();
      expect(s.category).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(s.path).toBeTruthy();
    }
  });

  test("every path is rooted at its own SDK", () => {
    // A path pointing into another SDK's tree would list the sample under the
    // wrong heading and count it against the wrong total.
    for (const s of samples) {
      expect(s.path.startsWith(`/${sdk}/`)).toBe(true);
    }
  });

  test("no duplicate paths", () => {
    const paths = samples.map((s) => s.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  test("no duplicate names", () => {
    const names = samples.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

test("no path is claimed by two different SDKs", () => {
  const seen = new Map<string, string>();
  for (const [sdk, samples] of Object.entries(REGISTRIES)) {
    for (const s of samples) {
      expect(seen.has(s.path)).toBe(false);
      seen.set(s.path, sdk);
    }
  }
});

test("Field Extraction stays unlisted", () => {
  // Unlisted 2026-08-06 (the studio supersedes it) but deliberately NOT deleted,
  // so the route still resolves. Re-listing should be a decision that updates
  // this test, not a stray uncomment.
  expect(pythonSdk.map((s) => s.path)).not.toContain(
    "/python-sdk/field-extraction",
  );
});
