import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { get } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import { extractionsPool } from "@/lib/extractions-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Types safe to hand a browser as-is. Notably absent: image/svg+xml. */
const SERVABLE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/tiff",
  "image/webp",
  "image/heic",
  "image/heif",
]);

/**
 * Headers that keep a stored file from behaving like a page.
 *
 * `nosniff` stops the browser second-guessing the Content-Type; the CSP and
 * sandbox neutralise anything that does get rendered; and a quoted, stripped
 * filename keeps a crafted name out of the header itself.
 */
function safetyHeaders(filename: string | undefined) {
  const safe = (filename ?? "attachment")
    .replace(/[^\w.\- ]+/g, "_")
    .slice(0, 100);
  return {
    "x-content-type-options": "nosniff",
    "content-security-policy": "default-src 'none'; sandbox",
    // `attachment`, not `inline`: navigating straight to this URL should download,
    // never render. The citation viewer is unaffected because it FETCHES the
    // document rather than navigating to it, and Content-Disposition does not
    // apply to fetch().
    "content-disposition": `attachment; filename="${safe}"`,
  };
}

/**
 * Stream the stored attachment.
 *
 * The Blob store is PRIVATE, so a blob URL is not a capability URL — reads go
 * through `get()` inside this authenticated Function and the bytes are streamed
 * back. A leaked URL on its own grants nothing (an anonymous GET returns 403).
 *
 * This is also the document the SDK read, so its pages are the ones the stored
 * bounding boxes belong to.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const expected = process.env.DASHBOARD_TOKEN?.trim();
  if (
    expected &&
    request.headers.get("authorization") !== `Bearer ${expected}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { rows } = await extractionsPool().query<{
    attachment_blob_url: string | null;
    attachment_meta: { filename?: string; content_type?: string } | null;
  }>(
    "select attachment_blob_url, attachment_meta from extractions where id = $1",
    [id],
  );

  const row = rows[0];
  if (!row?.attachment_blob_url) {
    return NextResponse.json({ error: "no_attachment" }, { status: 404 });
  }

  // `attachment_meta.content_type` is whatever the SENDER declared, so it is
  // untrusted input. Echoing it back as the response Content-Type is how a
  // stored file becomes stored XSS. Map through an allowlist instead; anything
  // unrecognised is served as opaque bytes.
  const declared = (row.attachment_meta?.content_type ?? "")
    .toLowerCase()
    .split(";")[0]
    .trim();
  const contentType = SERVABLE_TYPES.has(declared)
    ? declared
    : "application/octet-stream";

  // A replayed fixture stored with no Blob credentials records where the bytes
  // came from instead of uploading them, so serve them off disk. Real rows never
  // take this branch — `fixture://` is not a URL the SDK can produce.
  if (row.attachment_blob_url.startsWith("fixture://")) {
    const name = row.attachment_meta?.filename ?? "";
    for (const dir of ["invoices", "documents"]) {
      try {
        const bytes = await readFile(join(process.cwd(), "public", dir, name));
        return new NextResponse(new Uint8Array(bytes), {
          headers: {
            "content-type": contentType,
            ...safetyHeaders(row.attachment_meta?.filename),
          },
        });
      } catch {
        // try the next directory
      }
    }
    return NextResponse.json({ error: "fixture_not_found" }, { status: 404 });
  }

  // OIDC on Vercel, the read-write token elsewhere — the same split the
  // workflow's upload uses.
  const token = process.env.VERCEL
    ? undefined
    : process.env.BLOB_READ_WRITE_TOKEN;

  const blob = await get(row.attachment_blob_url, { access: "private", token });
  if (!blob?.stream) {
    return NextResponse.json({ error: "blob_unavailable" }, { status: 502 });
  }

  return new NextResponse(blob.stream, {
    headers: {
      "content-type": contentType,
      // Private bytes: let the browser reuse them, never a shared cache.
      "cache-control": "private, max-age=300",
      ...safetyHeaders(row.attachment_meta?.filename),
    },
  });
}
