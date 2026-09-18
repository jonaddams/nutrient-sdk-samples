import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Local stand-ins for the Resend Receiving API.
 *
 * A visitor cannot replicate "mail arrives at my inbound address" — that needs
 * their own Resend domain and DNS — so replaying a stored payload is how this
 * sample is actually experienced. Without this module the replay path starts the
 * workflow and then dies at the first step, because `receiving.get()` would be
 * asked for an email id Resend has never heard of.
 *
 * The fixture path is chosen by the email id alone. Real Resend ids do not begin
 * with `fixture-`, so there is no mode flag to set and no way for a live email to
 * land here by accident.
 */

const PREFIX = "fixture-";

export function isFixture(emailId: string): boolean {
  return emailId.startsWith(PREFIX);
}

/**
 * Strip the uniqueness suffix the replay route appends.
 *
 * Replaying the same fixture twice with the same id is correctly treated as a
 * duplicate delivery, so the route appends `-<timestamp>` when the caller wants
 * a fresh run. That id still starts with `fixture-`, so it must resolve back to
 * its definition — otherwise every repeat replay fails with "unknown fixture".
 */
function resolve(emailId: string): FixtureDefinition | undefined {
  return FIXTURES[emailId] ?? FIXTURES[emailId.replace(/-\d{10,}$/, "")];
}

interface FixtureDefinition {
  subject: string;
  from: string;
  text: string;
  /** Relative to public/. Absent means a body-only email. */
  attachment?: { path: string; filename: string; contentType: string };
}

/**
 * Documents come from the existing sample corpus rather than new files, so the
 * fixtures stay in step with the answer key in
 * ../extraction-studio/lib/verified.ts.
 */
const FIXTURES: Record<string, FixtureDefinition> = {
  "fixture-clean-invoice": {
    subject: "Invoice AC-2025-1047",
    from: "billing@atlasconstruction.example",
    text: "Please find attached invoice AC-2025-1047. Payment is due on receipt.",
    attachment: {
      path: "invoices/Invoice AC-2025-1047.pdf",
      filename: "Invoice AC-2025-1047.pdf",
      contentType: "application/pdf",
    },
  },
  "fixture-scanned-invoice": {
    subject: "Scanned invoice",
    from: "accounts@bruuuk.example",
    text: "Scan of the invoice attached.",
    attachment: {
      path: "documents/scanned-invoice.pdf",
      filename: "scanned-invoice.pdf",
      contentType: "application/pdf",
    },
  },
  "fixture-body-only": {
    subject: "Amount due, no attachment",
    from: "ops@vendor.example",
    // Deliberately extractable: a body-only email should reach `processed`, not
    // be flagged for review just because no PDF came with it.
    text: [
      "Hi — invoicing for March below, no PDF this time.",
      "",
      "Vendor: Vendor Co",
      "Invoice number: VC-0042",
      "Total: $1,250.00 USD",
      "Due: 2026-04-15",
    ].join("\n"),
  },
  "fixture-untrusted-sender": {
    subject: "Please process this",
    from: "stranger@elsewhere.example",
    text: "Can you run this through?",
  },
};

export function fixtureIds(): string[] {
  return Object.keys(FIXTURES);
}

export function fixtureEmail(emailId: string) {
  const def = resolve(emailId);
  if (!def) throw new Error(`unknown fixture ${emailId}`);
  return {
    subject: def.subject,
    from: def.from,
    text: def.text,
    html: null as string | null,
    attachments: def.attachment
      ? [
          {
            filename: def.attachment.filename,
            content_type: def.attachment.contentType,
            content_disposition: "attachment",
          },
        ]
      : [],
  };
}

export async function fixtureAttachment(emailId: string) {
  const def = resolve(emailId);
  if (!def) throw new Error(`unknown fixture ${emailId}`);
  if (!def.attachment) return { attachment: null, qualifying: 0 };

  // Read straight off disk. No signed URL, no expiry, no network — which is the
  // whole point: the replay path must work with zero credentials configured.
  const bytes = await readFile(
    join(process.cwd(), "public", def.attachment.path),
  );
  return {
    qualifying: 1,
    attachment: {
      filename: def.attachment.filename,
      contentType: def.attachment.contentType,
      size: bytes.byteLength,
      bytesBase64: bytes.toString("base64"),
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
  };
}
