import { afterEach, expect, test, vi } from "vitest";
import {
  confidenceHex,
  confidenceTone,
  extractOcr,
  OCR_LANGUAGES,
  ocrCitationsFor,
} from "../ocr";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const RESULT = {
  engine: "ADAPTIVE_OCR",
  filename: "scan.pdf",
  statistics: {
    totalElements: 1,
    textElements: 1,
    averageConfidence: 0.95,
    lowConfidenceElements: 0,
  },
  fullText: "[0] Invoice",
  textElements: [
    {
      readingOrder: 0,
      type: "paragraph",
      text: "Invoice",
      confidence: 0.95,
      page: 0,
      citation: { page: 0, x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 },
    },
  ],
  pages: [{ page: 1, width: 1654, height: 2338 }],
  config: { languages: "eng", outputFormat: "json", tableDetection: true },
  timingMs: 812,
};

function stubFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const calls: { url: string; body?: BodyInit | null }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url: String(url), body: init?.body ?? null });
      if (String(url).startsWith("/")) {
        return { ok: true, blob: async () => new Blob(["pdf"]) } as unknown as Response;
      }
      return response as Response;
    }) as unknown as typeof fetch,
  );
  return calls;
}

test("offers exactly the twenty verified language codes", () => {
  // Must mirror the backend allowlist. A code here that the backend rejects
  // would 400 on Run; one missing is a capability silently hidden.
  expect(OCR_LANGUAGES).toHaveLength(20);
  expect(OCR_LANGUAGES[0]).toBe("eng");
  expect(OCR_LANGUAGES).toContain("chi_sim");
});

test("joins selected languages with '+'", async () => {
  // A comma makes the SDK return an empty document; the backend rejects it, but
  // the client must never produce it in the first place.
  const calls = stubFetch({ ok: true, json: async () => RESULT });
  await extractOcr({
    docPath: "/documents/scan.pdf",
    filename: "scan.pdf",
    languages: ["eng", "deu"],
    tableDetection: true,
    outputFormat: "json",
  });
  const post = calls.find((c) => c.url.includes("/api/extraction/ocr"));
  const form = post?.body as FormData;
  expect(form.get("languages")).toBe("eng+deu");
});

test("sends table detection and output format", async () => {
  const calls = stubFetch({ ok: true, json: async () => RESULT });
  await extractOcr({
    docPath: "/documents/scan.pdf",
    filename: "scan.pdf",
    languages: ["eng"],
    tableDetection: false,
    outputFormat: "markdown",
  });
  const form = (calls.find((c) => c.url.includes("/api/extraction/ocr"))
    ?.body as FormData);
  expect(form.get("table_detection")).toBe("false");
  expect(form.get("output_format")).toBe("markdown");
});

test("defaults to eng when nothing is selected", async () => {
  // An empty languages string is a 400. Falling back to the SDK's own default
  // keeps an empty picker usable rather than an error.
  const calls = stubFetch({ ok: true, json: async () => RESULT });
  await extractOcr({
    docPath: "/documents/scan.pdf",
    filename: "scan.pdf",
    languages: [],
    tableDetection: true,
    outputFormat: "json",
  });
  const form = (calls.find((c) => c.url.includes("/api/extraction/ocr"))
    ?.body as FormData);
  expect(form.get("languages")).toBe("eng");
});

test("surfaces the backend's detail message", async () => {
  // The allowlist 400 names the offending code; a generic "500" would hide it.
  stubFetch({
    ok: false,
    status: 400,
    json: async () => ({ detail: "unsupported language code 'klingon'" }),
  });
  await expect(
    extractOcr({
      docPath: "/documents/scan.pdf",
      filename: "scan.pdf",
      languages: ["eng"],
      tableDetection: true,
      outputFormat: "json",
    }),
  ).rejects.toThrow("klingon");
});

const ELEMENT = {
  readingOrder: 0,
  type: "paragraph",
  text: "Invoice",
  confidence: 0.95,
  page: 0,
  citation: { page: 0, x0: 0.1, y0: 0.1, x1: 0.2, y1: 0.2 },
};

test("confidenceTone bands a score into three tones", () => {
  expect(confidenceTone(0.95)).toBe("good");
  expect(confidenceTone(0.6)).toBe("partial");
  expect(confidenceTone(0.2)).toBe("bad");
});

test("confidenceHex returns the exact .match-dot values", () => {
  // Asserted as literals on purpose. These MUST equal
  // .match-dot.good/.partial/.bad in styles.css — they diverged once, and the
  // dot beside an element and the box drawn for that same element were
  // visibly different greens. A test that recomputed them would not have
  // caught that.
  expect(confidenceHex(0.95)).toBe("#4a9d6a");
  expect(confidenceHex(0.6)).toBe("#c9a227");
  expect(confidenceHex(0.2)).toBe("#c8553c");
});

test("confidence mode gives every region its own tint", () => {
  const out = ocrCitationsFor(
    [ELEMENT, { ...ELEMENT, readingOrder: 1, confidence: 0.2 }],
    "confidence",
  );
  expect(out.map((c) => c.hex)).toEqual(["#4a9d6a", "#c8553c"]);
});

test("custom mode omits hex entirely, rather than setting it undefined", () => {
  // resolveHex is `citation.hex ?? fallback`, so an explicit `hex: undefined`
  // would still fall back correctly today — but asserting absence pins the
  // shape the design relies on and survives a future `??` becoming `||` or a
  // spread that treats the key as present.
  const out = ocrCitationsFor([ELEMENT], "custom");
  expect(out).toHaveLength(1);
  expect("hex" in out[0]).toBe(false);
});

test("elements without a citation drop out, in both modes", () => {
  const withNone = { ...ELEMENT, readingOrder: 1, citation: null };
  expect(ocrCitationsFor([ELEMENT, withNone], "confidence")).toHaveLength(1);
  expect(ocrCitationsFor([ELEMENT, withNone], "custom")).toHaveLength(1);
});

test("fieldIndex is the position in the FULL element list, not the compacted one", () => {
  // The trap: the returned array is COMPACTED (uncited elements are dropped),
  // so array position is not fieldIndex. fieldIndex has to keep pointing at
  // the original textElements row, or clicking a region in the document
  // selects the wrong row in the table.
  const out = ocrCitationsFor(
    [
      { ...ELEMENT, citation: null },
      { ...ELEMENT, readingOrder: 1 },
    ],
    "confidence",
  );
  expect(out).toHaveLength(1);
  expect(out[0].fieldIndex).toBe(1);
});
