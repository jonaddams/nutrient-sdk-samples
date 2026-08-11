import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type DescribeResult,
  extractDescription,
  PROMPT_PRESETS,
} from "../describe";
import fixture from "./fixtures/describe.json";

const req = {
  docPath: "/documents/lumen-invoice.pdf",
  filename: "lumen-invoice.pdf",
  provider: "claude",
  level: "detailed" as const,
  prompt: "",
};

// The document is fetched from public/ then forwarded as multipart, so both
// fetches are stubbed: the first for the file, the second for the API.
function stubFetch(apiResponse: Response) {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(new Blob(["%PDF-1.7"])))
    .mockResolvedValueOnce(apiResponse);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PROMPT_PRESETS", () => {
  it("offers three presets, with Describe first and carrying no prompt", () => {
    expect(PROMPT_PRESETS).toHaveLength(3);
    // Describe is the default and sends nothing, so the out-of-the-box demo
    // exercises the SDK's own prompt rather than ours.
    expect(PROMPT_PRESETS[0].id).toBe("describe");
    expect(PROMPT_PRESETS[0].prompt).toBe("");
  });

  it("gives the other two real prompts", () => {
    for (const p of PROMPT_PRESETS.slice(1)) {
      expect(p.prompt.length).toBeGreaterThan(10);
      expect(p.label.length).toBeGreaterThan(0);
    }
  });

  it("has unique ids", () => {
    expect(new Set(PROMPT_PRESETS.map((p) => p.id)).size).toBe(
      PROMPT_PRESETS.length,
    );
  });
});

describe("extractDescription", () => {
  it("sends provider, level and file as FORM fields, not query params", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify(fixture), { status: 200 }),
    );
    await extractDescription(req);
    const [url, init] = fetchMock.mock.calls[1];
    // /describe takes Form fields; /tables takes provider as a Query param.
    // Copying Tables' request construction here would send nothing readable.
    expect(String(url)).not.toContain("provider=");
    expect(String(url)).toContain("/api/extraction/describe");
    const body = init.body as FormData;
    expect(body.get("provider")).toBe("claude");
    expect(body.get("level")).toBe("detailed");
    expect(body.get("file")).toBeInstanceOf(File);
  });

  it("omits prompt entirely when it is empty, so the SDK's own default runs", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify(fixture), { status: 200 }),
    );
    await extractDescription({ ...req, prompt: "" });
    const body = fetchMock.mock.calls[1][1].body as FormData;
    expect(body.has("prompt")).toBe(false);
  });

  it("sends prompt when set", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify(fixture), { status: 200 }),
    );
    await extractDescription({ ...req, prompt: "Transcribe it." });
    const body = fetchMock.mock.calls[1][1].body as FormData;
    expect(body.get("prompt")).toBe("Transcribe it.");
  });

  it("sets no Content-Type header, so the browser can set the multipart boundary", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify(fixture), { status: 200 }),
    );
    await extractDescription(req);
    expect(fetchMock.mock.calls[1][1].headers).toBeUndefined();
  });

  it("returns the parsed result", async () => {
    stubFetch(new Response(JSON.stringify(fixture), { status: 200 }));
    const out: DescribeResult = await extractDescription(req);
    expect(out.engine).toBe(fixture.engine);
    expect(out.text.length).toBeGreaterThan(0);
  });

  it("surfaces FastAPI's detail message on failure", async () => {
    stubFetch(
      new Response(JSON.stringify({ detail: "provider unreachable" }), {
        status: 503,
      }),
    );
    await expect(extractDescription(req)).rejects.toThrow(
      "provider unreachable",
    );
  });

  it("falls back to a status message when the error body is not JSON", async () => {
    stubFetch(new Response("<html>502</html>", { status: 502 }));
    await expect(extractDescription(req)).rejects.toThrow("502");
  });

  it("reports a failure to load the document itself", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response("", { status: 404 })),
    );
    await expect(extractDescription(req)).rejects.toThrow("could not load");
  });
});
