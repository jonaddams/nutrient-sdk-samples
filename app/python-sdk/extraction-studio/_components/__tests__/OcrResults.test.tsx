import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { OcrResult } from "../../lib/ocr";
import { OcrResults } from "../OcrResults";

// Unconditional, not tail-of-body: an assertion that throws mid-test would
// otherwise skip the tail cleanup and leak a stubbed global or an active
// spy into every later test in this file (this file has no other global
// mocks that would be perturbed by a blanket restoreAllMocks() — the table
// rows and view toggle tests above touch no globals at all).
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const RESULT: OcrResult = {
  engine: "ADAPTIVE_OCR",
  filename: "scan.pdf",
  statistics: {
    totalElements: 2,
    textElements: 2,
    averageConfidence: 0.9,
    lowConfidenceElements: 1,
  },
  fullText: "[0] Invoice\n[1] Total",
  textElements: [
    {
      readingOrder: 0,
      type: "paragraph",
      text: "Invoice",
      confidence: 0.95,
      page: 0,
      citation: { page: 0, x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 },
    },
    {
      readingOrder: 1,
      type: "paragraph",
      text: "Total",
      confidence: 0.32,
      page: 0,
      citation: { page: 0, x0: 0.3, y0: 0.3, x1: 0.4, y1: 0.4 },
    },
  ],
  pages: [{ page: 1, width: 1654, height: 2338 }],
  config: { languages: "eng", outputFormat: "json", tableDetection: true },
  timingMs: 812,
};

const props = {
  result: RESULT,
  activeIndex: null,
  onSelectElement: vi.fn(),
  showRegions: true,
  onShowRegionsChange: vi.fn(),
  colorMode: "confidence" as const,
  onColorModeChange: vi.fn(),
  citationHex: "#ffc107",
  onCitationHexChange: vi.fn(),
};

test("shows timing, element count and average confidence", () => {
  render(<OcrResults {...props} />);
  expect(screen.getByText(/Elapsed time: 0\.8s/)).toBeInTheDocument();
  expect(screen.getByText(/2 elements/)).toBeInTheDocument();
  expect(screen.getByText(/90%/)).toBeInTheDocument();
});

test("lists every element with its confidence", () => {
  render(<OcrResults {...props} />);
  expect(screen.getByText("Invoice")).toBeInTheDocument();
  expect(screen.getByText("Total")).toBeInTheDocument();
  expect(screen.getByText("95%")).toBeInTheDocument();
  expect(screen.getByText("32%")).toBeInTheDocument();
});

test("clicking an element selects it", () => {
  const onSelectElement = vi.fn();
  render(<OcrResults {...props} onSelectElement={onSelectElement} />);
  fireEvent.click(screen.getByText("Total"));
  expect(onSelectElement).toHaveBeenCalledWith(1);
});

test("marks the active row and only the active row as selected", () => {
  render(<OcrResults {...props} activeIndex={1} />);
  expect(screen.getByText("Invoice").closest("tr")).toHaveAttribute(
    "data-selected",
    "false",
  );
  expect(screen.getByText("Total").closest("tr")).toHaveAttribute(
    "data-selected",
    "true",
  );
});

test("switches to the text view", () => {
  render(<OcrResults {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Text" }));
  expect(screen.getByText(/\[0\] Invoice/)).toBeInTheDocument();
});

test("names an empty result instead of showing a blank table", () => {
  // Silent emptiness is this feature's characteristic failure — a malformed
  // language string returns zero elements with no error — so the UI says so.
  render(
    <OcrResults
      {...props}
      result={{
        ...RESULT,
        textElements: [],
        statistics: { ...RESULT.statistics, totalElements: 0, textElements: 0 },
      }}
    />,
  );
  expect(screen.getByText(/no text found/i)).toBeInTheDocument();
});

// The REAL shape the backend returns for output_format=markdown — a uniform
// envelope with the same keys as the JSON path, empty on this side, not the
// JSON-shaped RESULT fixture spread with a markdown string bolted on. That
// fabrication is exactly how the crash this guards survived eight reviews:
// the fixture asserted a payload (non-empty textElements alongside markdown)
// the backend never actually produces. See app/services/extraction.py's
// extract_text_ocr and tests/test_extraction.py's
// test_ocr_endpoint_markdown_key_set_matches_json on the backend.
const MARKDOWN_RESULT: OcrResult = {
  engine: "OCR",
  filename: "scan.pdf",
  statistics: {
    totalElements: 0,
    textElements: 0,
    averageConfidence: 0,
    lowConfidenceElements: 0,
  },
  fullText: "",
  textElements: [],
  pages: [],
  markdown: "# Invoice",
  config: { languages: "eng", outputFormat: "markdown", tableDetection: true },
  timingMs: 620,
};

test("shows the markdown view when that format was requested, without throwing", () => {
  render(<OcrResults {...props} result={MARKDOWN_RESULT} />);
  expect(screen.getByText("# Invoice")).toBeInTheDocument();
});

test("omits the element count and confidence in markdown mode, keeping the timing", () => {
  // Markdown output carries no elements and no per-element confidence, so the
  // honest zeroes ("0 elements · 0% avg confidence") read as a failed run to
  // anyone who has not been told. Timing is the one stat that still means
  // something in this mode.
  render(<OcrResults {...props} result={MARKDOWN_RESULT} />);
  expect(screen.getByText(/Elapsed time: 0\.6s/)).toBeInTheDocument();
  expect(screen.queryByText(/\d+ elements/)).not.toBeInTheDocument();
  expect(screen.queryByText(/avg confidence/)).not.toBeInTheDocument();
});

test("the view toggle reflects the actual pane in markdown mode, both ways", () => {
  render(<OcrResults {...props} result={MARKDOWN_RESULT} />);

  const markdownButton = screen.getByRole("button", { name: "Markdown" });
  const jsonButton = screen.getByRole("button", { name: "JSON" });
  expect(markdownButton).toHaveAttribute("aria-pressed", "true");
  expect(jsonButton).toHaveAttribute("aria-pressed", "false");

  // Clicking JSON must flip which button reads pressed, not just swap the
  // pane while leaving Markdown stuck at aria-pressed="true" — the bug was
  // `value={isMarkdown ? "markdown" : view}`, which ignored `view` entirely
  // whenever isMarkdown was true.
  fireEvent.click(jsonButton);
  expect(screen.getByText(/"markdown": "# Invoice"/)).toBeInTheDocument();
  expect(jsonButton).toHaveAttribute("aria-pressed", "true");
  expect(markdownButton).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(markdownButton);
  expect(screen.getByText("# Invoice")).toBeInTheDocument();
  expect(markdownButton).toHaveAttribute("aria-pressed", "true");
  expect(jsonButton).toHaveAttribute("aria-pressed", "false");
});

test("degrades to an empty table instead of throwing if a future backend response omits fields the type declares required", () => {
  // `as unknown as OcrResult` on purpose: TypeScript would (rightly) reject
  // this at the call site, but the whole point of the defensive `?? []` /
  // `?? 0` reads in OcrResults is to survive a payload the type says cannot
  // happen. Simulating exactly that shape is the only way to test it.
  const malformed = {
    ...RESULT,
    statistics: undefined,
    textElements: undefined,
  } as unknown as OcrResult;
  expect(() =>
    render(<OcrResults {...props} result={malformed} />),
  ).not.toThrow();
  expect(screen.getByText(/no text found/i)).toBeInTheDocument();
});

const CODE = "import glob, json, re\nprint('hi')\n";

test("offers a Code segment in JSON mode and renders the snippet", () => {
  render(<OcrResults {...props} result={{ ...RESULT, code: CODE }} />);
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(screen.getByText(/import glob, json, re/)).toBeInTheDocument();
});

test("offers a Code segment in markdown mode too", () => {
  // The spec asks for Code in the JSON segment list. Shipping it there only
  // would make the promise vanish when a reviewer flips the Output control —
  // the same disappearing-promise problem one control deeper.
  render(<OcrResults {...props} result={{ ...MARKDOWN_RESULT, code: CODE }} />);
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(screen.getByText(/import glob, json, re/)).toBeInTheDocument();
});

test("Code wins over the markdown pane in markdown mode", () => {
  // The render chain used to lead with `isMarkdown && view !== "raw"`, which is
  // true when view is "code", so clicking Code in markdown mode would have
  // silently re-rendered the markdown.
  render(<OcrResults {...props} result={{ ...MARKDOWN_RESULT, code: CODE }} />);
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(screen.queryByText("# Invoice")).not.toBeInTheDocument();
});

test("degrades to a Python-commented placeholder when code is absent", () => {
  // Optional on purpose: the response type is a claim about the backend, not a
  // check on it, and this view ships before the backend deploy reaches Railway.
  //
  // The wording has to be true in exactly that window. This panel only renders
  // after a run, so "run OCR to see the code" instructs the reader to do the
  // thing they just did — it reads as a broken button, not a pending deploy.
  render(<OcrResults {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  expect(
    screen.getByText(/^# code snippet unavailable from this backend$/),
  ).toBeInTheDocument();
  expect(screen.queryByText(/run OCR to see/)).not.toBeInTheDocument();
});

test("the JSON view omits the code snippet", () => {
  // The snippet has its own segment; inlining 40 lines of Python as one escaped
  // string is the entire JSON pane's worth of noise. StructuredResults has the
  // same shape — its raw view shows data.extraction, not the envelope.
  render(<OcrResults {...props} result={{ ...RESULT, code: CODE }} />);
  fireEvent.click(screen.getByRole("button", { name: "JSON" }));
  expect(screen.queryByText(/"code":/)).not.toBeInTheDocument();
  expect(screen.getByText(/"filename": "scan.pdf"/)).toBeInTheDocument();
});

test("Copy writes the current view's payload to the clipboard", async () => {
  const writeText = vi.fn((_text: string) => Promise.resolve());
  vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });

  render(<OcrResults {...props} result={{ ...RESULT, code: CODE }} />);

  // Elements view (default): the JSON, minus the snippet.
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  expect(writeText).toHaveBeenCalledTimes(1);
  expect(writeText.mock.calls[0][0]).toContain('"filename": "scan.pdf"');
  expect(writeText.mock.calls[0][0]).not.toContain('"code":');

  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  fireEvent.click(screen.getByRole("button", { name: "Copy" }));
  expect(writeText).toHaveBeenNthCalledWith(2, CODE);
});

test("Download names the file after the view it was taken from", async () => {
  const createObjectURL = vi.fn((_blob: Blob) => "blob:mock-url");
  const revokeObjectURL = vi.fn();
  vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

  // The component never appends its anchor to the DOM, so intercepting its
  // creation is the only way to read the `download` filename back.
  const anchors: HTMLAnchorElement[] = [];
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName, options) => {
    const el = originalCreateElement(tagName, options);
    if (tagName === "a") anchors.push(el as HTMLAnchorElement);
    return el;
  });
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(() => {});

  render(<OcrResults {...props} result={{ ...RESULT, code: CODE }} />);

  fireEvent.click(screen.getByRole("button", { name: "Download" }));
  expect(createObjectURL).toHaveBeenCalledTimes(1);
  expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe(
    "application/json",
  );
  expect(anchors[0]?.download).toBe("ocr.json");

  // Deferred revoke: revoking synchronously races the browser's own blob fetch.
  expect(revokeObjectURL).not.toHaveBeenCalled();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

  fireEvent.click(screen.getByRole("button", { name: "Code" }));
  fireEvent.click(screen.getByRole("button", { name: "Download" }));
  const codeBlob = createObjectURL.mock.calls[1][0] as Blob;
  expect(codeBlob.type).toBe("text/x-python");
  await expect(codeBlob.text()).resolves.toBe(CODE);
  expect(anchors[1]?.download).toBe("ocr.py");

  expect(clickSpy).toHaveBeenCalledTimes(2);
});

test("Download writes markdown as .md, not .json", async () => {
  const createObjectURL = vi.fn((_blob: Blob) => "blob:mock-url");
  vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
  const anchors: HTMLAnchorElement[] = [];
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName, options) => {
    const el = originalCreateElement(tagName, options);
    if (tagName === "a") anchors.push(el as HTMLAnchorElement);
    return el;
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  render(<OcrResults {...props} result={{ ...MARKDOWN_RESULT, code: CODE }} />);
  fireEvent.click(screen.getByRole("button", { name: "Download" }));

  const blob = createObjectURL.mock.calls[0][0] as Blob;
  expect(blob.type).toBe("text/markdown");
  await expect(blob.text()).resolves.toBe("# Invoice");
  expect(anchors[0]?.download).toBe("ocr.md");
});

test("Download writes the Text view as .txt, not .json", async () => {
  const createObjectURL = vi.fn((_blob: Blob) => "blob:mock-url");
  vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
  const anchors: HTMLAnchorElement[] = [];
  const originalCreateElement = document.createElement.bind(document);
  vi.spyOn(document, "createElement").mockImplementation((tagName, options) => {
    const el = originalCreateElement(tagName, options);
    if (tagName === "a") anchors.push(el as HTMLAnchorElement);
    return el;
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

  render(<OcrResults {...props} result={{ ...RESULT, code: CODE }} />);
  fireEvent.click(screen.getByRole("button", { name: "Text" }));
  fireEvent.click(screen.getByRole("button", { name: "Download" }));

  const blob = createObjectURL.mock.calls[0][0] as Blob;
  expect(blob.type).toBe("text/plain");
  await expect(blob.text()).resolves.toBe(RESULT.fullText);
  expect(anchors[0]?.download).toBe("ocr.txt");
});

test("offers the region colour mode when regions are shown", () => {
  render(<OcrResults {...props} />);
  expect(screen.getByText("Region color")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "By confidence" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("button", { name: "Custom" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("hides the whole colour block when regions are hidden", () => {
  // It cannot do anything when nothing is drawn, and Show regions already
  // gates the overlay — same pairing StructuredResults uses.
  render(<OcrResults {...props} showRegions={false} />);
  expect(screen.queryByText("Region color")).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "By confidence" }),
  ).not.toBeInTheDocument();
});

test("shows swatches only in Custom mode", () => {
  const { rerender } = render(<OcrResults {...props} />);
  // Confidence mode: the mode control is there, the swatches are not.
  expect(
    screen.queryByRole("button", { name: "Amber" }),
  ).not.toBeInTheDocument();

  rerender(<OcrResults {...props} colorMode="custom" />);
  expect(screen.getByRole("button", { name: "Amber" })).toBeInTheDocument();
  expect(screen.getByLabelText("Region color hex value")).toBeInTheDocument();
});

test("Region color appears exactly once in Custom mode", () => {
  // The precise integration point `embedded` exists for: OcrResults renders
  // its own "Region color" eyebrow beside the Segmented control, and
  // HighlightColor renders a second one internally unless told not to. The
  // label-only test above never catches a duplicate because it only runs in
  // confidence mode, where HighlightColor isn't rendered at all.
  render(<OcrResults {...props} colorMode="custom" />);
  expect(screen.getAllByText("Region color")).toHaveLength(1);
});

test("reports a mode change rather than owning the state", () => {
  // page.tsx owns it: the overlay is built there, so a locally-held mode
  // would show a Custom button that repainted nothing.
  const onColorModeChange = vi.fn();
  render(<OcrResults {...props} onColorModeChange={onColorModeChange} />);
  fireEvent.click(screen.getByRole("button", { name: "Custom" }));
  expect(onColorModeChange).toHaveBeenCalledWith("custom");
});

test("passes the hex through to the picker and reports changes", () => {
  const onCitationHexChange = vi.fn();
  render(
    <OcrResults
      {...props}
      colorMode="custom"
      citationHex="#00a3e0"
      onCitationHexChange={onCitationHexChange}
    />,
  );
  expect(screen.getByRole("button", { name: "Cyan" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.click(screen.getByRole("button", { name: "Magenta" }));
  expect(onCitationHexChange).toHaveBeenCalledWith("#d63384");
});

test("the colour block survives an empty result", () => {
  // Show regions is rendered above the No-text-found callout, so the control
  // paired with it must be too — otherwise the panel contradicts itself.
  render(
    <OcrResults
      {...props}
      result={{
        ...RESULT,
        textElements: [],
        statistics: { ...RESULT.statistics, totalElements: 0, textElements: 0 },
      }}
    />,
  );
  expect(screen.getByText(/no text found/i)).toBeInTheDocument();
  expect(screen.getByText("Region color")).toBeInTheDocument();
});
