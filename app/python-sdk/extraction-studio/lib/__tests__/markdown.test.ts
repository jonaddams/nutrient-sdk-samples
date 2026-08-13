import { afterEach, describe, expect, it, vi } from "vitest";
import { extractMarkdown, type MarkdownResult } from "../markdown";
import fixture from "./fixtures/markdown.json";

const req = {
  docPath: "/documents/usenix-example-paper.pdf",
  filename: "usenix-example-paper.pdf",
  provider: "claude",
};

// Two fetches: the first loads the document from public/, the second calls the
// API. Same pattern as describe.test.ts.
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

describe("extractMarkdown", () => {
  it("sends provider as a QUERY parameter, not a form field", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify(fixture), { status: 200 }),
    );
    await extractMarkdown(req);
    const [url, init] = fetchMock.mock.calls[1];
    // /markdown takes provider as a Query param; /describe takes it as a Form
    // field. Copying describe's request construction here would send nothing
    // the backend reads, and it would silently default to claude.
    expect(String(url)).toContain("/api/extraction/markdown?provider=claude");
    expect((init.body as FormData).has("provider")).toBe(false);
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("sets no Content-Type header, so the browser sets the multipart boundary", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify(fixture), { status: 200 }),
    );
    await extractMarkdown(req);
    expect(fetchMock.mock.calls[1][1].headers).toBeUndefined();
  });

  it("returns the parsed result, including page counts", async () => {
    stubFetch(new Response(JSON.stringify(fixture), { status: 200 }));
    const out: MarkdownResult = await extractMarkdown(req);
    expect(out.engine).toBe("VLM_MARKDOWN");
    expect(out.totalPages).toBe(3);
    expect(out.markdown).toContain("# Towards Verifiable Extraction");
  });

  it("leaves code and timingMs undefined, because this backend sends neither", async () => {
    stubFetch(new Response(JSON.stringify(fixture), { status: 200 }));
    const out = await extractMarkdown(req);
    expect(out.code).toBeUndefined();
    expect(out.timingMs).toBeUndefined();
  });

  it("surfaces FastAPI's detail on a 503 from an unreachable provider", async () => {
    stubFetch(
      new Response(JSON.stringify({ detail: "provider unreachable" }), {
        status: 503,
      }),
    );
    await expect(extractMarkdown(req)).rejects.toThrow("provider unreachable");
  });

  it("surfaces the page prefix on a mid-document failure", async () => {
    // Pages run sequentially and fail fast, and the backend prefixes the error
    // with the failing page. On a 3-page document that prefix is the only
    // signal distinguishing a bad page from a bad document, so it must survive.
    stubFetch(
      new Response(JSON.stringify({ detail: "page 2: vision call failed" }), {
        status: 500,
      }),
    );
    await expect(extractMarkdown(req)).rejects.toThrow("page 2");
  });

  it("falls back to a status message when the error body is not JSON", async () => {
    stubFetch(new Response("<html>502</html>", { status: 502 }));
    await expect(extractMarkdown(req)).rejects.toThrow("502");
  });

  it("reports a failure to load the document itself", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response("", { status: 404 })),
    );
    await expect(extractMarkdown(req)).rejects.toThrow("could not load");
  });

  it("encodes the provider so a stray value cannot break the URL", async () => {
    const fetchMock = stubFetch(
      new Response(JSON.stringify(fixture), { status: 200 }),
    );
    await extractMarkdown({ ...req, provider: "open ai" });
    expect(String(fetchMock.mock.calls[1][0])).toContain("provider=open%20ai");
  });
});
