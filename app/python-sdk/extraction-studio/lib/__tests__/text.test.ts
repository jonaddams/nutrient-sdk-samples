import { beforeEach, describe, expect, it, vi } from "vitest";
import { elapsedLabel, extractText } from "../text";

describe("elapsedLabel", () => {
  // THE test for this feature. Every sibling panel does
  // `(timingMs / 1000).toFixed(1)`, which renders this feature's headline
  // number — single-digit milliseconds — as "0.0s". Bite-verify it: swap the
  // implementation for the naive one and watch this go red.
  it("renders sub-second timings in milliseconds, never as 0.0s", () => {
    expect(elapsedLabel(4)).toBe("4ms");
    expect(elapsedLabel(49)).toBe("49ms");
    expect(elapsedLabel(999)).toBe("999ms");
  });

  it("renders a second or more the way every sibling panel does", () => {
    expect(elapsedLabel(1000)).toBe("1.0s");
    expect(elapsedLabel(3246)).toBe("3.2s");
  });
});

describe("extractText", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches the document and posts it as multipart with no parameters", async () => {
    const body = {
      engine: "TEXT",
      filename: "a.pdf",
      text: "hello",
      charCount: 5,
      wordCount: 1,
      totalPages: 1,
      hasTextLayer: true,
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(["x"]) })
      .mockResolvedValueOnce({ ok: true, json: async () => body });
    vi.stubGlobal("fetch", fetchMock);

    const out = await extractText({
      docPath: "/documents/a.pdf",
      filename: "a.pdf",
    });

    expect(out).toEqual(body);
    const url = fetchMock.mock.calls[1][0] as string;
    // No query string at all: this endpoint takes no options, and inventing
    // one would be a control the SDK cannot honour.
    expect(url).not.toContain("?");
    expect(url.endsWith("/api/extraction/text")).toBe(true);
    expect(fetchMock.mock.calls[1][1].method).toBe("POST");
  });

  it("surfaces FastAPI's detail message rather than a bare status", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, blob: async () => new Blob(["x"]) })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: async () => ({ detail: "could not open document" }),
        }),
    );
    await expect(
      extractText({ docPath: "/documents/a.pdf", filename: "a.pdf" }),
    ).rejects.toThrow("could not open document");
  });

  it("fails loudly when the document itself cannot be fetched", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 404 }),
    );
    await expect(
      extractText({
        docPath: "/documents/missing.pdf",
        filename: "missing.pdf",
      }),
    ).rejects.toThrow("could not load /documents/missing.pdf: 404");
  });
});
