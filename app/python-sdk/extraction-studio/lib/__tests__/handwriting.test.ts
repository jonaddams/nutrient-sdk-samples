import { afterEach, expect, test, vi } from "vitest";
import {
  extractHandwriting,
  type HandwritingResult,
  handwritingCitationsFor,
  isVlmRun,
} from "../handwriting";
import local from "./fixtures/handwriting-local.json";
import vlm from "./fixtures/handwriting-vlm.json";

const LOCAL = local as unknown as HandwritingResult;
const VLM = vlm as unknown as HandwritingResult;

afterEach(() => {
  vi.restoreAllMocks();
});

/** Stubs the two fetches extractHandwriting makes: the document, then the API. */
function stubFetch(apiResponse: object, ok = true) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      calls.push(String(url));
      if (calls.length === 1) {
        return { ok: true, blob: async () => new Blob(["pdf"]) } as Response;
      }
      return {
        ok,
        status: ok ? 200 : 500,
        json: async () => apiResponse,
      } as Response;
    }),
  );
  return calls;
}

test("local engine posts to /icr with no query string", async () => {
  const calls = stubFetch(LOCAL);
  await extractHandwriting({
    docPath: "/documents/note.jpg",
    filename: "note.jpg",
    engine: "local",
    provider: "openai",
  });
  // The provider is carried in the request object regardless, because the
  // config panel keeps its selection across an engine switch. Local must not
  // send it: /icr takes no provider and the whole claim is that it needs none.
  expect(calls[1]).toBe("http://localhost:8080/api/extraction/icr");
});

test("vlm engine posts the provider as a QUERY parameter", async () => {
  // /vlm declares provider as Query, not Form — unlike /describe, which takes
  // it as Form. Sending it in the body means the SDK default (localhost:1234)
  // and a 503 on any machine without LM Studio.
  const calls = stubFetch(VLM);
  await extractHandwriting({
    docPath: "/documents/note.jpg",
    filename: "note.jpg",
    engine: "vlm",
    provider: "claude",
  });
  expect(calls[1]).toBe(
    "http://localhost:8080/api/extraction/vlm?provider=claude",
  );
});

test("a backend detail message is surfaced rather than the status code", async () => {
  stubFetch({ detail: "no local VLM server" }, false);
  await expect(
    extractHandwriting({
      docPath: "/documents/note.jpg",
      filename: "note.jpg",
      engine: "vlm",
      provider: "claude",
    }),
  ).rejects.toThrow("no local VLM server");
});

test("citations from a local run carry a confidence colour", () => {
  const cits = handwritingCitationsFor(LOCAL, "confidence");
  expect(cits.length).toBeGreaterThan(0);
  expect(cits[0].hex).toBeTruthy();
});

test("a VLM run omits hex entirely, whatever colour mode is passed", () => {
  // The bite: VLM's confidences describe the LOCAL pass, so colouring by them
  // paints the model's corrections red. `custom` is forced here rather than
  // trusted from the caller. Omitting the KEY (not setting it undefined) is
  // what makes resolveHex's `?? fallback` fall through to the studio picker.
  const cits = handwritingCitationsFor(VLM, "confidence");
  expect(cits.length).toBeGreaterThan(0);
  for (const c of cits) {
    expect("hex" in c).toBe(false);
  }
});

test("citations are compacted, so array position is not the element index", () => {
  const sparse = {
    ...LOCAL,
    textElements: [
      { ...LOCAL.textElements[0], citation: null },
      LOCAL.textElements[1],
    ],
  } as HandwritingResult;
  const cits = handwritingCitationsFor(sparse, "confidence");
  expect(cits).toHaveLength(1);
  expect(cits[0].fieldIndex).toBe(1);
});

test("no result means no boxes", () => {
  expect(handwritingCitationsFor(null, "confidence")).toEqual([]);
});

test("isVlmRun reads the RESULT's engine, not the panel's current toggle", () => {
  expect(isVlmRun(VLM)).toBe(true);
  expect(isVlmRun(LOCAL)).toBe(false);
});
