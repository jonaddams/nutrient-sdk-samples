import { createHash } from "node:crypto";
import { put } from "@vercel/blob";
import { Resend } from "resend";
import { extractionsPool } from "@/lib/extractions-db";
import { parseAuthResults, senderIsAuthentic } from "../_lib/auth-results";
import { fixtureAttachment, fixtureEmail, isFixture } from "../_lib/fixtures";
import {
  type RawExtractionPayload,
  ungroundedPaths,
  walkCitations,
} from "../_lib/grounding";
import {
  assess,
  EXTRACTION_INSTRUCTIONS,
  INVOICE_SCHEMA,
} from "../_lib/schema";

/**
 * The durable half of the pipeline.
 *
 * Everything here runs after the webhook has already returned 200. That split is
 * not an optimisation: Resend expects a fast acknowledgement and retries on
 * anything else, while fetching a PDF and extracting from it takes longer than
 * it is willing to wait.
 *
 * Each `"use step"` boundary records its input and output, so a failure retries
 * that step alone — the pipeline does not re-download the attachment because the
 * extraction call timed out, and does not re-extract because the final UPDATE hit
 * a transient error. Error cases 15-17 and 20 in the spec mostly fall out of this
 * rather than being hand-written.
 */

interface AttachmentResult {
  filename: string;
  contentType: string;
  size: number;
  /** Base64 — step outputs are serialised, so raw Buffers do not survive. */
  bytesBase64: string;
  sha256: string;
}

/**
 * Attachment types this pipeline will store and extract from.
 *
 * Deliberately an allowlist. The obvious `type.startsWith("image/")` also admits
 * `image/svg+xml`, which is not a scan format but a document that can carry
 * script — and since attachments are served back from this app's own origin,
 * storing one is stored XSS waiting for someone to open it.
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

const MAX_ATTACHMENT_BYTES = Number(
  process.env.MAX_ATTACHMENT_BYTES ?? 20 * 1024 * 1024,
);

/**
 * Credentials for Vercel Blob.
 *
 * The SDK prefers OIDC whenever BLOB_STORE_ID and VERCEL_OIDC_TOKEN are present,
 * which is right on Vercel — the token rotates and no long-lived secret sits in
 * the environment. Locally it fails with "OIDC is enabled for this project, but
 * not for the development environment" unless that environment is explicitly
 * opted in, so off-Vercel we hand it the read-write token instead. That is the
 * documented split: OIDC on Vercel, the static token for code running elsewhere.
 */
function blobToken(): string | undefined {
  if (process.env.VERCEL) return undefined; // let the SDK use OIDC
  return process.env.BLOB_READ_WRITE_TOKEN || undefined;
}

function resend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}

async function markProcessing(emailId: string): Promise<void> {
  "use step";
  await extractionsPool().query(
    "update extractions set status = 'processing' where email_id = $1",
    [emailId],
  );
}

/**
 * The webhook payload carries metadata only — sender, recipient, subject. The
 * body and the attachment bytes need separate Receiving API calls, which is the
 * other half of why this cannot run inline in the webhook.
 */
async function fetchEmail(emailId: string) {
  "use step";
  // Replayed fixtures never reach Resend — see _lib/fixtures.ts. Real Resend ids
  // do not start with "fixture-", so a live email cannot take this branch.
  if (isFixture(emailId)) {
    // Replayed fixtures are locally sourced, so there is nothing to spoof and
    // nothing to verify. Marked verified so they do not carry a warning flag.
    return {
      ...fixtureEmail(emailId),
      auth: { dmarc: "pass", spf: "pass", dkim: "pass", raw: null } as const,
    };
  }

  const { data, error } = await resend().emails.receiving.get(emailId);
  if (error) throw new Error(`receiving.get failed: ${error.message}`);
  return {
    subject: data?.subject ?? null,
    text: data?.text ?? null,
    html: data?.html ?? null,
    attachments: data?.attachments ?? [],
    // The sender allowlist matches on `From`, which is forgeable. These are what
    // make it mean something — see _lib/auth-results.ts.
    auth: parseAuthResults(
      (data as { headers?: unknown } | null)?.headers as never,
    ),
  };
}

/**
 * Download the first qualifying attachment.
 *
 * The size check runs against the metadata BEFORE the download, so an oversized
 * file never crosses the wire. Checking after would have already paid the cost
 * the limit exists to avoid.
 */
async function fetchPrimaryAttachment(
  emailId: string,
): Promise<{ attachment: AttachmentResult | null; qualifying: number }> {
  "use step";
  if (isFixture(emailId)) return fixtureAttachment(emailId);

  const { data, error } = await resend().emails.receiving.attachments.list({
    emailId,
  });
  if (error) throw new Error(`attachments.list failed: ${error.message}`);

  const all = data?.data ?? [];
  const qualifying = all.filter((a) => {
    const type = (a.content_type ?? "").toLowerCase().split(";")[0].trim();
    // An ALLOWLIST, not `image/*`. `image/svg+xml` matches `image/` and is not a
    // scan format — it is a document that can carry script, and serving one back
    // from our own origin is stored XSS. Nothing here can execute.
    const isDocument = INGESTIBLE_TYPES.has(type);
    // Inline parts are usually signature images, correlated by content_id.
    const isInline = (a.content_disposition ?? "").toLowerCase() === "inline";
    return isDocument && !isInline;
  });

  if (qualifying.length === 0) {
    return { attachment: null, qualifying: 0 };
  }

  const chosen = qualifying[0];
  if (typeof chosen.size === "number" && chosen.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `attachment ${chosen.size} bytes exceeds MAX_ATTACHMENT_BYTES ${MAX_ATTACHMENT_BYTES}`,
    );
  }

  // The download_url is a SIGNED url valid for one hour. Never persist it as a
  // step output: a workflow resuming after an interruption would find it dead.
  // Record the bytes instead.
  const res = await fetch(chosen.download_url);
  if (!res.ok)
    throw new Error(`attachment download failed: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());

  return {
    qualifying: qualifying.length,
    attachment: {
      filename: chosen.filename ?? "attachment.pdf",
      contentType: chosen.content_type ?? "application/octet-stream",
      size: bytes.byteLength,
      bytesBase64: bytes.toString("base64"),
      // Hashed on arrival, before anything transforms the bytes. This is the key
      // for content-level dedupe (the same invoice forwarded from a different
      // address has a different email_id but the same hash).
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
}

/**
 * Store the original as received. It is also the document the extraction reads,
 * so it is the one the bounding boxes are valid against.
 */
async function storeOriginal(
  emailId: string,
  attachment: AttachmentResult,
): Promise<string> {
  "use step";
  // Blob is a credential too. Without it the replay path would still stop short,
  // so a fixture records where the bytes came from instead of uploading them.
  if (
    isFixture(emailId) &&
    !process.env.BLOB_STORE_ID &&
    !process.env.BLOB_READ_WRITE_TOKEN
  ) {
    return `fixture://${emailId}/${attachment.filename}`;
  }

  const blob = await put(
    `email-extraction/${emailId}/original/${attachment.filename}`,
    Buffer.from(attachment.bytesBase64, "base64"),
    {
      access: "private",
      contentType: attachment.contentType,
      token: blobToken(),
    },
  );
  return blob.url;
}

async function recordFetched(
  emailId: string,
  rawBody: string | null,
  blobUrl: string | null,
  attachment: AttachmentResult | null,
  qualifying: number,
  senderVerified: boolean,
): Promise<void> {
  "use step";
  await extractionsPool().query(
    `update extractions
        set raw_body            = $2,
            attachment_blob_url = $3,
            attachment_meta     = $4,
            attachment_count    = $5,
            content_sha256      = $6,
            context_flags       = $7
      where email_id = $1`,
    [
      emailId,
      rawBody,
      blobUrl,
      attachment
        ? JSON.stringify({
            filename: attachment.filename,
            content_type: attachment.contentType,
            size: attachment.size,
          })
        : null,
      qualifying,
      attachment?.sha256 ?? null,
      [
        ...(attachment ? [] : ["no_attachment"]),
        ...(qualifying > 1 ? ["multiple_attachments"] : []),
        // Visible, not silent: the allowlist accepted this sender but the domain
        // ownership could not be confirmed either way.
        ...(senderVerified ? [] : ["sender_unverified"]),
      ],
    ],
  );
}

async function markFailed(emailId: string, reason: string): Promise<void> {
  "use step";
  await extractionsPool().query(
    `update extractions
        set status = 'failed', error_reason = $2, attempt_count = attempt_count + 1
      where email_id = $1`,
    [emailId, reason.slice(0, 500)],
  );
}

/**
 * Call the extraction service.
 *
 * Returns the SDK's RAW payload rather than the service's own `data.fields`,
 * because that helper only walks top-level field names. Nested values —
 * `total.amount`, every `line_items[i]` — carry their own bounding boxes, and
 * consuming the flattened view would silently drop them.
 */
async function runExtraction(
  attachment: AttachmentResult | null,
): Promise<{ raw: RawExtractionPayload; config: unknown; ms: number } | null> {
  "use step";
  const base = process.env.EXTRACTION_SERVICE_URL ?? "http://localhost:8080";

  // Body-only emails have no document to ground against, so there is nothing for
  // this architecture to extract from. Left for a later build step rather than
  // silently returning an empty result.
  if (!attachment) return null;

  const form = new FormData();
  form.append(
    "file",
    new Blob([Buffer.from(attachment.bytesBase64, "base64")], {
      type: attachment.contentType,
    }),
    attachment.filename,
  );
  form.append("json_schema", JSON.stringify(INVOICE_SCHEMA));
  form.append("instructions", EXTRACTION_INSTRUCTIONS);

  const url = new URL("/api/extraction/structured", base);
  url.searchParams.set(
    "provider",
    process.env.EXTRACTION_PROVIDER ?? "anthropic",
  );
  url.searchParams.set("includeConfidence", "true");
  url.searchParams.set("includeSourceLocations", "true");

  const token = process.env.EXTRACTION_SERVICE_TOKEN;
  const res = await fetch(url, {
    method: "POST",
    body: form,
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(
      `extraction service ${res.status}: ${detail.slice(0, 300)}`,
    );
  }

  const envelope = (await res.json()) as {
    raw?: string;
    config?: unknown;
    timingMs?: number;
  };
  if (!envelope.raw)
    throw new Error("extraction service returned no raw payload");

  return {
    raw: JSON.parse(envelope.raw) as RawExtractionPayload,
    config: envelope.config ?? null,
    ms: envelope.timingMs ?? 0,
  };
}

async function persistExtraction(
  emailId: string,
  result: { raw: RawExtractionPayload; config: unknown } | null,
): Promise<string> {
  "use step";
  if (!result) {
    await extractionsPool().query(
      `update extractions set status='needs_review',
              review_flags = array['no_document_to_extract']
        where email_id = $1`,
      [emailId],
    );
    return "needs_review";
  }

  const extraction = result.raw.extraction ?? {};
  const citations = walkCitations(result.raw);
  const ungrounded = ungroundedPaths(extraction, citations);
  const { reviewFlags, contextFlags } = assess(extraction, ungrounded);
  const status = reviewFlags.length > 0 ? "needs_review" : "processed";

  await extractionsPool().query(
    `update extractions
        set status          = $2::extraction_status,
            extracted_data  = $3,
            field_citations = $4,
            raw_extraction  = $5,
            review_flags    = $6,
            context_flags   = context_flags || $7::text[],
            attempt_count   = attempt_count + 1
      where email_id = $1`,
    [
      emailId,
      status,
      JSON.stringify(extraction),
      JSON.stringify(citations),
      JSON.stringify({ config: result.config, pages: result.raw.pages }),
      reviewFlags,
      contextFlags,
    ],
  );
  return status;
}

export async function extractionWorkflow(emailId: string) {
  "use workflow";

  await markProcessing(emailId);

  try {
    const email = await fetchEmail(emailId);
    // Refuse a forged sender BEFORE the attachment download and the extraction
    // call — those are what cost money. A row already exists, so the rejection is
    // visible on the dashboard rather than silent.
    const authentic = senderIsAuthentic(email.auth);
    if (!authentic.ok) {
      await markFailed(emailId, `sender_not_authentic:${authentic.reason}`);
      return { emailId, status: "failed", qualifying: 0 };
    }

    const { attachment, qualifying } = await fetchPrimaryAttachment(emailId);

    const blobUrl = attachment
      ? await storeOriginal(emailId, attachment)
      : null;

    // Prefer the plain-text part. It is what a body-only extraction reads, and
    // it is what the accuracy comparison runs against later.
    const rawBody = email.text ?? email.html ?? null;
    await recordFetched(
      emailId,
      rawBody,
      blobUrl,
      attachment,
      qualifying,
      authentic.verified,
    );

    // Content-level dedupe (a prior row with the same content_sha256) is the
    // deliberate optional step — the hash is recorded above, so adding the
    // lookup later needs no migration.
    const extracted = await runExtraction(attachment);
    const status = await persistExtraction(emailId, extracted);

    return { emailId, status, qualifying };
  } catch (err) {
    await markFailed(emailId, err instanceof Error ? err.message : String(err));
    throw err;
  }
}
