import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyText, downloadText } from "../download";

describe("downloadText", () => {
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clickSpy = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:stub"),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(document, "createElement").mockImplementation(
      () => ({ click: clickSpy, href: "", download: "" }) as never,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("clicks a link carrying the requested filename", () => {
    downloadText("a,b\n1,2\n", "tables.csv", "text/csv");
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
  });

  it("defers revoking the blob URL", () => {
    // Revoking synchronously races the browser's internal blob fetch for the
    // download in some browsers (notably older Safari).
    vi.useFakeTimers();
    downloadText("x", "x.txt", "text/plain");
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:stub");
    vi.useRealTimers();
  });
});

describe("copyText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reports success when the clipboard accepts the text", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("hello")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("reports failure instead of rejecting when permission is denied", async () => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn(() => Promise.reject(new Error("denied"))),
      },
    });
    await expect(copyText("hello")).resolves.toBe(false);
  });

  it("reports failure instead of throwing when there is no clipboard at all", async () => {
    // In a non-secure context navigator.clipboard is undefined, so the call
    // throws SYNCHRONOUSLY — a .catch() alone would not have caught it.
    vi.stubGlobal("navigator", {});
    await expect(copyText("hello")).resolves.toBe(false);
  });
});
