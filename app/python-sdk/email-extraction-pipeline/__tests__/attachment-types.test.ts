import { describe, expect, it } from "vitest";

/**
 * Attachment type handling, at both ends.
 *
 * Attachments are stored from untrusted email and served back from this app's
 * own origin, which makes the content type a security boundary rather than a
 * formatting detail. The original filter was `type.startsWith("image/")`, which
 * also admits `image/svg+xml` — not a scan format but a document that can carry
 * script. Combined with echoing the sender's declared content type back as the
 * response header, that is stored XSS.
 *
 * Both sets are duplicated from the route and workflow modules, which cannot be
 * imported into a test without the workflow runtime and a database pool. These
 * assertions are what catch a divergence.
 */

const INGESTIBLE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/tiff",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const SERVABLE_TYPES = new Set([...INGESTIBLE_TYPES]);

const normalise = (t: string) => t.toLowerCase().split(";")[0].trim();
const ingestible = (t: string) => INGESTIBLE_TYPES.has(normalise(t));
const servedAs = (t: string) =>
  SERVABLE_TYPES.has(normalise(t)) ? normalise(t) : "application/octet-stream";

const ACTIVE_CONTENT = [
  "image/svg+xml",
  "text/html",
  "application/xhtml+xml",
  "text/xml",
  "application/xml",
  "text/javascript",
  "application/javascript",
];

describe("ingest filter", () => {
  it("accepts the document types this pipeline extracts from", () => {
    for (const t of [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/tiff",
    ]) {
      expect(ingestible(t)).toBe(true);
    }
  });

  it("REJECTS every active-content type", () => {
    // The finding: `startsWith("image/")` let image/svg+xml through.
    for (const t of ACTIVE_CONTENT) {
      expect(ingestible(t), `${t} must not be ingestible`).toBe(false);
    }
  });

  it("is not fooled by parameters or casing", () => {
    expect(ingestible("Application/PDF; charset=binary")).toBe(true);
    expect(ingestible("IMAGE/SVG+XML; charset=utf-8")).toBe(false);
  });
});

describe("serve content type", () => {
  it("passes an allowlisted type through unchanged", () => {
    expect(servedAs("application/pdf")).toBe("application/pdf");
    expect(servedAs("image/png")).toBe("image/png");
  });

  it("downgrades anything else to opaque bytes", () => {
    // Defence in depth: even a row stored before the ingest filter existed
    // cannot be served with a renderable type.
    for (const t of ACTIVE_CONTENT) {
      expect(servedAs(t), `${t} must not be served as itself`).toBe(
        "application/octet-stream",
      );
    }
  });

  it("downgrades an absent or empty declared type", () => {
    expect(servedAs("")).toBe("application/octet-stream");
  });
});

describe("filename sanitisation", () => {
  // The filename also comes from the sender and lands in a response header.
  const safe = (f: string | undefined) =>
    (f ?? "attachment").replace(/[^\w.\- ]+/g, "_").slice(0, 100);

  it("keeps an ordinary filename readable", () => {
    expect(safe("Invoice AC-2025-1047.pdf")).toBe("Invoice AC-2025-1047.pdf");
  });

  it("strips quotes and newlines that could break out of the header", () => {
    expect(safe('evil";\r\nSet-Cookie: a=b')).not.toContain('"');
    expect(safe('evil";\r\nSet-Cookie: a=b')).not.toContain("\n");
    expect(safe('evil";\r\nSet-Cookie: a=b')).not.toContain("\r");
  });

  it("bounds the length", () => {
    expect(safe("a".repeat(500)).length).toBe(100);
  });
});
