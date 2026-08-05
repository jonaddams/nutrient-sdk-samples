import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import ExtractionStudio from "../page";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** Only the providers endpoint is fetched from this page's own tree — the
 *  document list is a code manifest (lib/docs.ts), not a fetch. */
function stubProvidersFetch(providers: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("/api/extraction/providers")) {
        return {
          ok,
          status: ok ? 200 : 503,
          json: async () => ({ providers }),
        };
      }
      throw new Error(`unexpected fetch in this test: ${url}`);
    }) as unknown as typeof fetch,
  );
}

// Merge blocker: Run used to be gated only on `busy`, so a click before the
// providers fetch resolved sent the hardcoded initial provider ("openai"),
// and a click after a failed fetch failed just as confusingly. These are the
// composed-page proof that the fix holds — StructuredConfig.test.tsx proves
// the underlying onProvidersReady signal; this proves page.tsx actually wires
// it to the button.
test("Run extraction is unavailable until the providers fetch resolves", async () => {
  stubProvidersFetch([
    { id: "openai", label: "OpenAI", models: [], defaultModel: "gpt-5.4" },
  ]);
  render(<ExtractionStudio />);

  const run = screen.getByRole("button", { name: /run extraction/i });
  expect(run).toBeDisabled();

  await waitFor(() => expect(run).not.toBeDisabled());
});

test("Run extraction stays unavailable after a failed providers fetch", async () => {
  stubProvidersFetch(null, false);
  render(<ExtractionStudio />);

  const run = screen.getByRole("button", { name: /run extraction/i });
  expect(run).toBeDisabled();

  // Give the rejected fetch a turn to settle, then confirm Run never opened up.
  await waitFor(() =>
    expect(
      (screen.getByLabelText("Provider") as HTMLSelectElement).disabled,
    ).toBe(true),
  );
  expect(run).toBeDisabled();
});
