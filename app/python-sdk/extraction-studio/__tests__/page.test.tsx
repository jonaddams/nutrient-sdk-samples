import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

/** The existing stubProvidersFetch() THROWS on any unexpected URL, so an OCR
 *  test has to account for all three fetches the flow makes: the providers
 *  endpoint, the document itself from public/, and the OCR endpoint. */
function stubOcrFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/extraction/providers")) {
        return { ok: true, status: 200, json: async () => ({ providers: [] }) };
      }
      if (u.includes("/api/extraction/ocr")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            engine: "ADAPTIVE_OCR",
            filename: "scan.pdf",
            statistics: {
              totalElements: 1,
              textElements: 1,
              averageConfidence: 0.9,
              lowConfidenceElements: 0,
            },
            fullText: "[0] Invoice",
            textElements: [
              {
                readingOrder: 0,
                type: "paragraph",
                text: "Invoice",
                confidence: 0.9,
                page: 0,
                citation: { page: 0, x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 },
              },
            ],
            pages: [{ page: 1, width: 1654, height: 2338 }],
            config: {
              languages: "eng",
              outputFormat: "json",
              tableDetection: true,
            },
            timingMs: 800,
          }),
        };
      }
      // the document fetched from public/ before upload
      return { ok: true, status: 200, blob: async () => new Blob(["pdf"]) };
    }) as unknown as typeof fetch,
  );
}

test("Adaptive OCR is selectable and swaps in its own panel", () => {
  stubOcrFetch();
  render(<ExtractionStudio />);
  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  // OCR's own control appears...
  expect(screen.getByText("Languages")).toBeInTheDocument();
  // ...and structured extraction's schema builder is gone.
  expect(screen.queryByText("Schema builder")).toBeNull();
});

test("Run is enabled for OCR even with no providers configured", async () => {
  // OCR needs no credentials. Gating its Run button on the providers fetch
  // would leave it permanently disabled on a backend with no LLM keys.
  stubOcrFetch();
  render(<ExtractionStudio />);
  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /run extraction/i }),
    ).not.toBeDisabled(),
  );
});

test("switching feature clears the previous feature's results", async () => {
  // Stale structured results under an OCR panel is the obvious bug in a
  // feature-switching shell.
  stubOcrFetch();
  render(<ExtractionStudio />);

  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() => expect(screen.getByText("Invoice")).toBeInTheDocument());

  fireEvent.click(
    screen.getByRole("button", { name: /structured extraction/i }),
  );
  expect(screen.queryByText("Invoice")).toBeNull();
});
