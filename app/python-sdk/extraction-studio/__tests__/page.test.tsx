import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { samples } from "../../samples";
import { FEATURES } from "../_components/FeatureRail";
import type { IndexedCitation } from "../lib/citations";
import ExtractionStudio from "../page";

// DocViewer needs a real SDK global (window.NutrientViewer) to load anything,
// which jsdom never provides, so every other test here has simply never
// looked at what DocViewer receives. Recording the `citations` prop is the
// only way to prove page.tsx's viewerCitations ternary picks the right
// branch — see the tests below that assert on `data-citation-count`.
//
// `citationRenders` also captures EVERY render the mock sees, not just the
// settled one `screen` can query after an interaction. That distinction
// matters: switching feature triggers a React state update (the new feature)
// immediately followed by a passive effect that clears every result
// (page.tsx's `useEffect` keyed on `[feature]`). Testing Library's `act()`
// flushes that cascading effect before `fireEvent.click` returns, so a plain
// post-click DOM assertion only ever sees the FINAL settled render — it
// cannot distinguish "computed 0 citations immediately" from "briefly
// recomputed the previous feature's citations, then got cleared a beat
// later". Only a spy on every render call can see that intermediate frame,
// and that frame is exactly what `feature === "describe" ? NO_CITATIONS :`
// exists to keep from ever being nonzero.
const { citationRenders } = vi.hoisted(() => ({
  citationRenders: [] as number[],
}));

vi.mock("../_components/DocViewer", () => ({
  DocViewer: ({ citations }: { citations: IndexedCitation[] }) => {
    citationRenders.push(citations.length);
    return (
      <div data-testid="doc-viewer" data-citation-count={citations.length} />
    );
  },
}));

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

// Composed-page proof that switching feature actually resets the gate: only
// one config panel is mounted at a time, so `providersReady` is left `true`
// by whichever mounted last. Without resetting it on a feature change,
// switching from Structured (already ready) to Tables would leave Run
// enabled before TablesConfig's own provider fetch has resolved — the exact
// early click the gate exists to prevent.
test("switching from Structured to Table extraction re-gates Run until Tables' own provider fetch resolves", async () => {
  stubProvidersFetch([
    { id: "openai", label: "OpenAI", models: [], defaultModel: "gpt-5.4" },
  ]);
  render(<ExtractionStudio />);

  const run = screen.getByRole("button", { name: /run extraction/i });
  await waitFor(() => expect(run).not.toBeDisabled());

  fireEvent.click(screen.getByRole("button", { name: /table extraction/i }));
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

// Composed-page proof that the tables ternary branch is wired: the studio's
// feature ternaries are binary (`feature === "structured" ? … : …`), so
// anything not "structured" used to fall through to the OCR branch. This is
// the guard that a missed/reverted tables branch renders the wrong panel.
test("Table extraction is selectable and swaps in its own panel", () => {
  stubProvidersFetch([]);
  render(<ExtractionStudio />);
  fireEvent.click(screen.getByRole("button", { name: /table extraction/i }));
  // Tables' own control appears...
  expect(screen.getByLabelText("Provider")).toBeInTheDocument();
  // ...and OCR's panel — the ternary's fallback branch — does not.
  expect(screen.queryByText("Languages")).toBeNull();
});

test("Image description is selectable and swaps in its own panel", async () => {
  // Its config panel is identifiable by the Detail control, which no other
  // feature has.
  stubProvidersFetch([]);
  render(<ExtractionStudio />);
  await userEvent.click(
    screen.getByRole("button", { name: /Image description/ }),
  );
  await waitFor(() =>
    expect(screen.getByRole("group", { name: "Detail" })).toBeInTheDocument(),
  );
});

test("draws no citation overlay for Image description", async () => {
  // Output is prose with no coordinates, so there is nothing to paint and no
  // Show regions control.
  stubProvidersFetch([]);
  render(<ExtractionStudio />);
  await userEvent.click(
    screen.getByRole("button", { name: /Image description/ }),
  );
  expect(screen.queryByLabelText("Show regions")).toBeNull();
  expect(screen.queryByLabelText("Show citations")).toBeNull();

  // The controls-absence checks above are NOT proof of this: Show
  // regions/Show citations live in the results panels, which never mount
  // here (tab is "config", no result). This is the actual guarantee — what
  // page.tsx hands DocViewer's `citations` prop for the "describe" branch.
  // Without the `feature === "describe" ? NO_CITATIONS :` branch,
  // viewerCitations's final `else` is `ocrCitations`, which would still be
  // whatever a PREVIOUS OCR run left behind.
  expect(screen.getByTestId("doc-viewer")).toHaveAttribute(
    "data-citation-count",
    "0",
  );
});

// The test above is NOT the trap-proof version: it never gives OCR anything
// to leave behind, so it would pass for the trivial reason that nothing has
// any citations, whether or not the "describe" branch exists — the same trap
// the pre-fix test fell into. Nor is a plain post-click DOM assertion enough
// on its own here — see `citationRenders`'s comment above: the feature-change
// effect that clears `ocrResult` gets flushed by `act()` before
// `fireEvent.click` returns, so BOTH the buggy and the fixed code settle to a
// final "0" and a bare `screen.getByTestId` assertion cannot tell them apart
// (verified by hand: temporarily deleting the `NO_CITATIONS` branch left this
// kind of assertion green). Reading every render the mock saw — not just the
// last one — is what actually catches the stale frame.
test("switching from a populated OCR run to Image description never paints a stale overlay", async () => {
  stubOcrFetch();
  render(<ExtractionStudio />);

  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() =>
    expect(screen.getByTestId("doc-viewer")).toHaveAttribute(
      "data-citation-count",
      "1",
    ),
  );

  // Only renders from this point on are relevant to the switch under test.
  citationRenders.length = 0;
  fireEvent.click(screen.getByRole("button", { name: /Image description/ }));

  // Without `feature === "describe" ? NO_CITATIONS :`, the render that fires
  // the instant `feature` becomes "describe" (before the clearing effect
  // runs) still computes `viewerCitations` as `ocrCitations` — the previous
  // OCR run's box, painted on the document for one commit. Every recorded
  // render across the whole switch must be 0, not just the settled last one.
  expect(citationRenders.every((count) => count === 0)).toBe(true);
  expect(citationRenders.length).toBeGreaterThan(0);
});

// The trivial-pass trap the test above would fall into on its own: asserting
// 0 citations for "describe" proves nothing if OCR's own branch is ALSO
// always 0 in this test setup. This proves the OCR branch actually produces
// citations when a result is present, so the "describe" test's 0 means what
// it claims to mean.
test("draws a citation overlay for Adaptive OCR once a result is present", async () => {
  stubOcrFetch();
  render(<ExtractionStudio />);

  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  expect(screen.getByTestId("doc-viewer")).toHaveAttribute(
    "data-citation-count",
    "0",
  );

  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() =>
    expect(screen.getByTestId("doc-viewer")).toHaveAttribute(
      "data-citation-count",
      "1",
    ),
  );
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

// Critical, reproduced by hand: OCR "Vandelay Industries", switch the
// document to "Lumen", reopen Results — Vandelay's elements (and their
// citations, drawn at Vandelay's coordinates) were still on screen because
// selectDoc cleared `result` but not `ocrResult`. selectDoc also flips the
// tab back to "config", which hides the results panel and masks the bug
// until Results is reopened — so this test reopens it rather than trusting
// the click-through alone.
test("switching documents clears OCR results", async () => {
  stubOcrFetch();
  render(<ExtractionStudio />);

  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() => expect(screen.getByText("Invoice")).toBeInTheDocument());

  fireEvent.click(screen.getByRole("button", { name: /lumen/i }));
  // selectDoc sends the tab back to "config" — reopen Results rather than
  // taking the config view's silence as proof the results actually cleared.
  fireEvent.click(screen.getByRole("button", { name: "Results" }));
  expect(screen.queryByText("Invoice")).toBeNull();
});

// Reproduces the exact demo move from the review: select a row to box it,
// change a config option, Run again. handleRun (structured) has always
// cleared activeIndex on a new run; the inline OCR onRun did not, so a stale
// selection survived a re-run and dimmed every box via
// styleFor(fieldIndex, activeIndex) — worse, if the new run returned fewer
// elements than before, it marked none. This asserts the row is no longer
// selected after a second run even though it was never clicked again.
test("re-running OCR clears the previous selection instead of leaving it stale", async () => {
  stubOcrFetch();
  render(<ExtractionStudio />);

  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() => expect(screen.getByText("Invoice")).toBeInTheDocument());

  fireEvent.click(screen.getByText("Invoice"));
  expect(screen.getByText("Invoice").closest("tr")).toHaveAttribute(
    "data-selected",
    "true",
  );

  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() =>
    expect(screen.getByText("Invoice").closest("tr")).toHaveAttribute(
      "data-selected",
      "false",
    ),
  );
});

/** OCR provider stub whose SECOND call to the OCR endpoint fails, so a test
 *  can run once successfully and then re-run into an error. */
function stubOcrFetchFailingOnRerun() {
  let ocrCalls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/extraction/providers")) {
        return { ok: true, status: 200, json: async () => ({ providers: [] }) };
      }
      if (u.includes("/api/extraction/ocr")) {
        ocrCalls++;
        if (ocrCalls > 1) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ detail: "OCR backend unavailable" }),
          };
        }
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
      return { ok: true, status: 200, blob: async () => new Blob(["pdf"]) };
    }) as unknown as typeof fetch,
  );
}

// The unified behaviour this branch introduces: handleOcrRun used to clear
// its result at the START of a run and never on error, so a failed re-run
// left the previous successful OCR result on screen underneath the error
// callout. runFeature's catch branch now clears it, closing that gap.
test("a failed OCR re-run clears the previously-rendered result", async () => {
  stubOcrFetchFailingOnRerun();
  render(<ExtractionStudio />);

  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() => expect(screen.getByText("Invoice")).toBeInTheDocument());

  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "OCR backend unavailable",
    ),
  );
  expect(screen.queryByText("Invoice")).toBeNull();
});

/** Tables provider stub whose SECOND call to the tables endpoint fails, so a
 *  test can run once successfully and then re-run into an error. */
function stubTablesFetchFailingOnRerun() {
  let tablesCalls = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/extraction/providers")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            providers: [
              {
                id: "openai",
                label: "OpenAI",
                models: [],
                defaultModel: "gpt-5.4",
              },
            ],
          }),
        };
      }
      if (u.includes("/api/extraction/tables")) {
        tablesCalls++;
        if (tablesCalls > 1) {
          return {
            ok: false,
            status: 500,
            json: async () => ({ detail: "tables backend unavailable" }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            engine: "VLM_TABLES",
            filename: "x.pdf",
            provider: "openai",
            tableCount: 1,
            tables: [
              {
                rowCount: 1,
                columnCount: 1,
                cells: [
                  {
                    row: 0,
                    column: 0,
                    rowSpan: 1,
                    colSpan: 1,
                    text: "Concrete",
                    confidence: 0.95,
                    bounds: null,
                  },
                ],
              },
            ],
            rawElements: [],
            totalPages: 1,
            processedPages: 1,
          }),
        };
      }
      return { ok: true, status: 200, blob: async () => new Blob(["pdf"]) };
    }) as unknown as typeof fetch,
  );
}

// Same unified behaviour, proven for Tables: handleTablesRun used to clear at
// start and never on error, same gap as OCR's. Covering a second feature
// (rather than trusting the OCR case alone) guards against the extraction
// having special-cased one call site.
test("a failed Tables re-run clears the previously-rendered result", async () => {
  stubTablesFetchFailingOnRerun();
  render(<ExtractionStudio />);

  fireEvent.click(screen.getByRole("button", { name: /table extraction/i }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /run extraction/i }),
    ).not.toBeDisabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() => expect(screen.getByText("Concrete")).toBeInTheDocument());

  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "tables backend unavailable",
    ),
  );
  expect(screen.queryByText("Concrete")).toBeNull();
});

/** OCR endpoint whose response the caller lands on demand, so a document or
 *  feature switch that happens after Run is clicked but before the response
 *  resolves is reproducible on command rather than racing real network
 *  timing. Providers and the pre-upload document fetch resolve immediately,
 *  exactly like stubOcrFetch() — only OCR's own endpoint is deferred. */
function stubOcrFetchDeferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (reason?: unknown) => void;
  const ocrResponse = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/extraction/providers")) {
        return { ok: true, status: 200, json: async () => ({ providers: [] }) };
      }
      if (u.includes("/api/extraction/ocr")) {
        return ocrResponse;
      }
      return { ok: true, status: 200, blob: async () => new Blob(["pdf"]) };
    }) as unknown as typeof fetch,
  );

  return {
    /** Lands the in-flight request as a success carrying "Invoice", the same
     *  body stubOcrFetch() uses. */
    landSuccess: () =>
      resolve({
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
      }),
    /** Lands the in-flight request as a failure. */
    landFailure: (message: string) => reject(new Error(message)),
  };
}

// runFeature captures `feature`/`doc` at request start and compares them
// against featureRef/docRef once the request resolves — neither the rail nor
// the doc strip is disabled while busy, so the user is free to switch either
// mid-request, and a response that lands after that switch must not
// repopulate state the switch already cleared. A reviewer proved this
// uncovered: dropping the docRef comparison from the success path left the
// entire suite passing. These three tests land a response AFTER performing
// the switch, so the race is genuine rather than assumed.
test("a document switch mid-flight discards the OCR result that lands after it", async () => {
  const { landSuccess } = stubOcrFetchDeferred();
  render(<ExtractionStudio />);

  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /running/i }),
    ).toBeInTheDocument(),
  );

  // Neither the doc strip nor the rail disables while busy — switch documents
  // before the in-flight request resolves.
  fireEvent.click(screen.getByRole("button", { name: /lumen/i }));

  landSuccess();
  // Wait for runFeature's continuation (guarded or not) to fully settle —
  // `busy` flips back to false in `finally`, unconditionally, regardless of
  // which document is current, so this is a race-free sync point.
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /run extraction/i }),
    ).toBeInTheDocument(),
  );

  // The switch itself already cleared ocrResult — that's not what's under
  // test. What matters is whether the response that arrived AFTER the switch
  // repopulated it. Navigate to Results explicitly and confirm it stayed
  // empty, rather than trusting the config tab's silence.
  fireEvent.click(screen.getByRole("button", { name: "Results" }));
  expect(screen.queryByText("Invoice")).toBeNull();
});

test("a feature switch mid-flight discards the OCR result that lands after it", async () => {
  const { landSuccess } = stubOcrFetchDeferred();
  render(<ExtractionStudio />);

  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /running/i }),
    ).toBeInTheDocument(),
  );

  // Neither the rail nor the doc strip disables while busy — switch feature
  // before OCR's in-flight request resolves.
  fireEvent.click(
    screen.getByRole("button", { name: /structured extraction/i }),
  );
  // Confirm the switch actually took: Structured's own config panel is up,
  // still on the Configuration tab — a feature switch never touches `tab`.
  expect(screen.getByText("Schema builder")).toBeInTheDocument();

  landSuccess();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /run extraction/i }),
    ).toBeInTheDocument(),
  );

  // Were the guard absent, the success path's unconditional setTab("results")
  // would force the panel to Results even though Structured never ran
  // anything, surfacing the shared "no results yet" placeholder there — the
  // panel must stay on Configuration, and OCR's own result must not leak into
  // the newly-selected feature either.
  expect(screen.getByText("Schema builder")).toBeInTheDocument();
  expect(screen.queryByText("Run an extraction to see results.")).toBeNull();
  expect(screen.queryByText("Invoice")).toBeNull();
});

test("a late-landing OCR failure is discarded after a document switch mid-flight", async () => {
  const { landFailure } = stubOcrFetchDeferred();
  render(<ExtractionStudio />);

  fireEvent.click(screen.getByRole("button", { name: /adaptive ocr/i }));
  fireEvent.click(screen.getByRole("button", { name: /run extraction/i }));
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /running/i }),
    ).toBeInTheDocument(),
  );

  fireEvent.click(screen.getByRole("button", { name: /lumen/i }));

  landFailure("boom: request abandoned by the switch");
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /run extraction/i }),
    ).toBeInTheDocument(),
  );

  // The guard wraps the error branch too: an error surfacing for a request
  // the user already switched away from is just as wrong as a stale result
  // would be, and must not raise the error callout.
  expect(screen.queryByRole("alert")).toBeNull();
});

// The page and the landing-page registry card each carry the studio's
// prospect-facing name in their own string literal, so they can drift apart —
// which is exactly what happened when Adaptive OCR shipped and the page still
// read "Structured Extraction" while hosting two features. Pin them together.
test("the page header and the registry card agree on the studio's name", () => {
  stubProvidersFetch([]);
  render(<ExtractionStudio />);

  const entry = samples.find((s) => s.path === "/python-sdk/extraction-studio");
  expect(entry).toBeDefined();
  expect(
    screen.getByRole("heading", { level: 1, name: entry?.name }),
  ).toBeInTheDocument();
});

test("every enabled rail feature renders a configuration panel", async () => {
  // The map's own guard. FeatureRail.test.tsx pins a hardcoded RENDERABLE set;
  // this proves the panel actually mounts, which a set literal cannot. An
  // enabled feature with no map entry falls through to the structured panel,
  // and that silent fallback is exactly what this catches.
  //
  // Asserts on `.studio-sec` (PanelSection.tsx's own class), not the
  // similarly-named `.panel-section` CSS rule in styles.css — that one only
  // ever appears in the Results tab's empty state, never on the Config tab
  // this test lands on, so it can never observe a mounted config panel.
  for (const f of FEATURES.filter((x) => x.enabled)) {
    const { unmount } = render(<ExtractionStudio />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(f.label) }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Run extraction/ }),
      ).toBeTruthy(),
    );
    expect(document.querySelector(".studio-sec")).toBeTruthy();
    unmount();
  }
});
