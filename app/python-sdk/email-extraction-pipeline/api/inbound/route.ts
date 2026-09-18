import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { extractionsPool } from "@/lib/extractions-db";
import { verifySvixSignature } from "../../_lib/svix";
import { extractionWorkflow } from "../../_workflows/extraction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend `email.received` webhook.
 *
 * The only latency-critical path in the sample. Resend expects a fast 2xx and
 * retries on anything else, so this route does no document work at all: it
 * verifies, claims, hands off, and returns. Everything expensive happens in the
 * workflow.
 *
 * The webhook payload is metadata only — sender, recipient, subject. The body
 * and the attachment bytes need separate Receiving API calls, which is the
 * other reason this cannot be synchronous.
 */

interface EmailReceivedEvent {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[] | string;
    cc?: string[] | string;
    received_for?: string[] | string;
    subject?: string;
    created_at?: string;
  };
}

/** `Name <addr@host>` or a bare address, lowercased. */
function bareAddress(value: string): string {
  const v = value.trim().toLowerCase();
  return v.match(/<([^>]+)>/)?.[1] ?? v;
}

function toList(value: string[] | string | undefined | null): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : value.split(",")).map(bareAddress);
}

/**
 * Is this message addressed to the inbox this sample owns?
 *
 * Resend fans every inbound message for a domain out to EVERY webhook endpoint
 * subscribed to `email.received`. Without this check, adding a second sample
 * that also receives email means each one ingests the other's mail — and this
 * pipeline would stamp a `failed` row on every message that was never meant for
 * it.
 *
 * Unset means accept everything, which is right for local development and wrong
 * in a deployment; the sample README says so.
 */
function addressedToUs(event: EmailReceivedEvent): boolean {
  const ours = process.env.INBOUND_RECIPIENT?.trim().toLowerCase();
  if (!ours) return true;
  const recipients = [
    // `received_for` is the ENVELOPE recipient and is the most reliable of the
    // three: a message can reach this inbox via a header that names someone
    // else entirely (bcc, a forward, a mailing list).
    ...toList(event.data?.received_for),
    ...toList(event.data?.to),
    ...toList(event.data?.cc),
  ];
  return recipients.includes(bareAddress(ours));
}

function senderAllowed(from: string | null): boolean {
  const raw = process.env.INBOUND_SENDER_ALLOWLIST?.trim();
  // Empty means open. For a public demo it should never be empty — visitors
  // drive the pipeline through fixture replay, which keeps one person's invoice
  // off another person's dashboard.
  if (!raw) return true;
  if (!from) return false;
  const address = bareAddress(from);
  return raw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
    .some((entry) =>
      entry.startsWith("@") ? address.endsWith(entry) : address === entry,
    );
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "config", message: "RESEND_WEBHOOK_SECRET is not set." },
      { status: 500 },
    );
  }

  // Raw body first. Do not call request.json() before this.
  const rawBody = await request.text();

  const verified = verifySvixSignature(rawBody, request.headers, secret);
  if (!verified.ok) {
    console.warn("[inbound] rejected webhook: %s", verified.reason);
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: EmailReceivedEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    // 200 on purpose: a retry cannot fix malformed JSON, and Resend stores all
    // inbound mail regardless, so nothing is lost by declining to retry.
    console.warn("[inbound] unparseable payload, acknowledging anyway");
    return NextResponse.json({ ok: true, ignored: "unparseable" });
  }

  if (event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: event.type ?? "unknown" });
  }

  const emailId = event.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ ok: true, ignored: "no email_id" });
  }

  // Not ours. Acknowledge and record NOTHING — unlike a disallowed sender, which
  // gets a visible `failed` row, a message addressed elsewhere is simply another
  // consumer's mail and writing a row for it would be claiming it.
  if (!addressedToUs(event)) {
    return NextResponse.json({ ok: true, ignored: "not_our_recipient" });
  }

  const from = event.data?.from ?? null;
  const pool = extractionsPool();

  if (!senderAllowed(from)) {
    // Recorded rather than dropped, so the dashboard can show that it happened —
    // but with no attachment fetch, no extraction, and no spend.
    await pool.query(
      `insert into extractions (email_id, from_address, subject, received_at, status, error_reason)
       values ($1, $2, $3, $4, 'failed', 'sender_not_allowed')
       on conflict (email_id) do nothing`,
      [
        emailId,
        from,
        event.data?.subject ?? null,
        event.data?.created_at ?? null,
      ],
    );
    return NextResponse.json({ ok: true, ignored: "sender_not_allowed" });
  }

  // Rate cap. With the allowlist opened to a whole company so colleagues can
  // demo, this is what bounds the damage if a sender is spoofed or someone
  // forwards a mailing list at the address by accident. Counted off created_at
  // rather than a counter, so it needs no extra state and self-heals.
  const cap = Number(process.env.MAX_EXTRACTIONS_PER_HOUR ?? 0);
  if (cap > 0) {
    const { rows } = await pool.query<{ n: string }>(
      "select count(*)::text n from extractions where created_at > now() - interval '1 hour'",
    );
    if (Number(rows[0]?.n ?? 0) >= cap) {
      // The row is still written, so nothing is lost and the dashboard shows
      // that the cap was hit — but no workflow starts and no money is spent.
      // Resend retains the mail, so it can be replayed after the window.
      await pool.query(
        `insert into extractions (email_id, from_address, subject, received_at, status, error_reason)
         values ($1, $2, $3, $4, 'failed', 'hourly_cap_reached')
         on conflict (email_id) do nothing`,
        [
          emailId,
          from,
          event.data?.subject ?? null,
          event.data?.created_at ?? null,
        ],
      );
      console.warn(
        "[inbound] hourly cap of %d reached; deferring %s",
        cap,
        emailId,
      );
      return NextResponse.json({ ok: true, ignored: "hourly_cap_reached" });
    }
  }

  // 1. Idempotency lock. The row is written BEFORE any work, so a retry that
  //    arrives while the first delivery is still processing collides here.
  await pool.query(
    `insert into extractions (email_id, from_address, subject, received_at)
     values ($1, $2, $3, $4)
     on conflict (email_id) do nothing`,
    [
      emailId,
      from,
      event.data?.subject ?? null,
      event.data?.created_at ?? null,
    ],
  );

  // 2. Claim the right to start the workflow.
  //
  //    This is deliberately NOT "did the insert above affect a row". A row
  //    existing is not evidence that its work was scheduled: if the insert
  //    succeeds and start() then throws, the retry would find the row present,
  //    return 200, and the email would sit in 'received' forever with nothing
  //    to notice it. The claim tests the thing we actually care about.
  const claim = await pool.query<{ id: string }>(
    `update extractions
        set workflow_claimed_at = now()
      where email_id = $1
        and workflow_run_id is null
        and workflow_claimed_at is null
      returning id`,
    [emailId],
  );

  if (claim.rowCount === 0) {
    // Already claimed or already running. Duplicate delivery: no work, no cost.
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // 3. Hand off, then record the run id.
  //
  //    If start() throws, the row stays claimed with no run id — which is
  //    exactly the state the sweeper looks for. Returning 500 here is correct:
  //    a retry IS the right response to a transient enqueue failure, and the
  //    claim query above means the retry will genuinely re-attempt rather than
  //    short-circuiting as a duplicate.
  let runId: string;
  try {
    const run = await start(extractionWorkflow, [emailId]);
    runId = run.runId;
  } catch (err) {
    console.error("[inbound] start() failed for %s: %s", emailId, err);
    await pool.query(
      "update extractions set workflow_claimed_at = null where email_id = $1",
      [emailId],
    );
    return NextResponse.json({ error: "enqueue_failed" }, { status: 500 });
  }

  await pool.query(
    "update extractions set workflow_run_id = $1 where email_id = $2",
    [runId, emailId],
  );

  return NextResponse.json({ ok: true, emailId, runId });
}
