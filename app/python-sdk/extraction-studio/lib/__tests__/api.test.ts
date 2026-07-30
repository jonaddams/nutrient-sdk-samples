import { afterEach, describe, expect, test, vi } from "vitest";
import { extractStructured } from "../api";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const ENVELOPE = {
  feature: "structured_extraction",
  resultType: "structured",
  config: { provider: "openai", model: "gpt-5.4" },
  timingMs: 9488,
  filename: "invoice.pdf",
  data: { fields: [], extraction: {} },
  raw: "{}",
  code: "from nutrient_sdk import ...",
};

/** Stubs the two fetches extractStructured makes: the PDF, then the API. */
function stubFetches(
  apiResponse: Partial<Response> & { json?: () => Promise<unknown> },
  pdfOk = true,
) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    if (calls.length === 1) {
      return {
        ok: pdfOk,
        status: pdfOk ? 200 : 404,
        blob: async () => new Blob([new Uint8Array([37, 80, 68, 70])]),
      };
    }
    return apiResponse;
  });
  vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch);
  return calls;
}

const REQ = {
  docPath: "/documents/lumen-invoice.pdf",
  filename: "lumen-invoice.pdf",
  schema: '{"schema":{"type":"object"}}',
};

describe("extractStructured", () => {
  test("fetches the document from its public path first", async () => {
    const calls = stubFetches({ ok: true, json: async () => ENVELOPE });
    await extractStructured(REQ);
    expect(calls[0].url).toBe("/documents/lumen-invoice.pdf");
  });

  test("posts multipart to the structured endpoint and returns the envelope", async () => {
    const calls = stubFetches({ ok: true, json: async () => ENVELOPE });
    const out = await extractStructured(REQ);

    expect(out.resultType).toBe("structured");
    expect(out.filename).toBe("invoice.pdf");

    const api = calls[1];
    expect(api.url).toContain("/api/extraction/structured");
    expect(api.init?.method).toBe("POST");
    expect(api.init?.body).toBeInstanceOf(FormData);
  });

  test("sends the schema under the json_schema field, not schema", async () => {
    // Both `schema` and `schema_json` shadow deprecated Pydantic v1 methods on
    // v2's BaseModel, so the backend's Form parameter is `json_schema`. Getting
    // this wrong is a 422 the UI cannot explain, hence a test.
    const calls = stubFetches({ ok: true, json: async () => ENVELOPE });
    await extractStructured(REQ);

    const body = calls[1].init?.body as FormData;
    expect(body.get("json_schema")).toBe('{"schema":{"type":"object"}}');
    expect(body.get("schema")).toBeNull();
  });

  test("sends the file under the file field with the requested filename", async () => {
    const calls = stubFetches({ ok: true, json: async () => ENVELOPE });
    await extractStructured(REQ);

    const file = (calls[1].init?.body as FormData).get("file");
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe("lumen-invoice.pdf");
  });

  test("does not set content-type — the browser must add the multipart boundary", async () => {
    const calls = stubFetches({ ok: true, json: async () => ENVELOPE });
    await extractStructured(REQ);
    expect(calls[1].init?.headers).toBeUndefined();
  });

  test("passes the option flags as query parameters with defaults applied", async () => {
    const calls = stubFetches({ ok: true, json: async () => ENVELOPE });
    await extractStructured(REQ);

    const url = new URL(calls[1].url, "http://x");
    expect(url.searchParams.get("provider")).toBe("openai");
    expect(url.searchParams.get("includeSourceLocations")).toBe("true");
    expect(url.searchParams.get("includePageImages")).toBe("false");
    expect(url.searchParams.get("strict")).toBe("false");
  });

  test("overrides the defaults when flags are supplied", async () => {
    const calls = stubFetches({ ok: true, json: async () => ENVELOPE });
    await extractStructured({
      ...REQ,
      provider: "local",
      includePageImages: true,
      strict: true,
      includeSourceLocations: false,
    });

    const url = new URL(calls[1].url, "http://x");
    expect(url.searchParams.get("provider")).toBe("local");
    expect(url.searchParams.get("includePageImages")).toBe("true");
    expect(url.searchParams.get("strict")).toBe("true");
    expect(url.searchParams.get("includeSourceLocations")).toBe("false");
  });

  test("surfaces the backend's detail message rather than a bare status", async () => {
    // A missing vision_vlm_data_extraction_api entitlement arrives as a 500
    // whose only diagnosable content is `detail`. Losing it makes the failure
    // unexplainable from the UI.
    stubFetches({
      ok: false,
      status: 500,
      json: async () => ({
        detail:
          "The registered license does not support the feature 'vision_vlm_data_extraction_api'.",
      }),
    });
    await expect(extractStructured(REQ)).rejects.toThrow(
      /vision_vlm_data_extraction_api/,
    );
  });

  test("falls back to the status when there is no detail to report", async () => {
    stubFetches({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    });
    await expect(extractStructured(REQ)).rejects.toThrow(/502/);
  });

  test("reports the document path when the PDF itself cannot be loaded", async () => {
    stubFetches({ ok: true, json: async () => ENVELOPE }, false);
    await expect(extractStructured(REQ)).rejects.toThrow(
      /could not load \/documents\/lumen-invoice\.pdf/,
    );
  });
});
