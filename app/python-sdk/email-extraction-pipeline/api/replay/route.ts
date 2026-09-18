import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { fixtureIds } from "../../_lib/fixtures";
import { signSvixPayload } from "../../_lib/svix";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Replay a stored `email.received` payload through the real webhook.
 *
 * The demo's front door. It signs the fixture and POSTs it at `/api/inbound`
 * rather than calling the workflow directly, so a visitor clicking a button
 * exercises the same signature verification, idempotency claim and allowlist
 * that a real Resend delivery would. A replay that skipped the webhook would
 * demonstrate a different system from the one being described.
 */

/**
 * A sender the allowlist will accept.
 *
 * Replay is a local action from the dashboard, but it goes through the real
 * webhook — which is the point, and which means it must satisfy the same sender
 * allowlist as live mail. Deriving the address from the allowlist keeps the
 * buttons working under any configuration: with `@nutrient.io` set, replays come
 * from `replay@nutrient.io`. Without this, turning the allowlist on silently
 * breaks the demo's front door.
 *
 * `REPLAY_FROM` overrides it when you want replays attributed to someone specific.
 */
function replaySender(): string {
  const override = process.env.REPLAY_FROM?.trim();
  if (override) return override;
  const first = process.env.INBOUND_SENDER_ALLOWLIST?.split(",")[0]?.trim();
  if (!first) return "replayed@fixture.local";
  return first.startsWith("@") ? `replay${first}` : first;
}

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        error: "config",
        message:
          "RESEND_WEBHOOK_SECRET is not set. Any whsec_-prefixed base64 value " +
          "works locally — the webhook and this route just have to agree.",
      },
      { status: 500 },
    );
  }

  const { fixture, fresh } = (await request.json().catch(() => ({}))) as {
    fixture?: string;
    fresh?: boolean;
  };

  if (!fixture || !fixtureIds().includes(fixture)) {
    return NextResponse.json(
      { error: "unknown_fixture", available: fixtureIds() },
      { status: 400 },
    );
  }

  // `fresh` appends a suffix so the same fixture can be replayed repeatedly.
  // Without it the second click is correctly recognised as a duplicate — which
  // is a good thing to be able to show on purpose, and a confusing thing to hit
  // by accident.
  const emailId = fresh ? `${fixture}-${Date.now()}` : fixture;

  const payload = JSON.stringify({
    type: "email.received",
    data: {
      email_id: emailId,
      // Must satisfy the same sender allowlist and recipient filter a real
      // delivery does — a replay that routed differently from live mail would be
      // demonstrating a different system.
      from: replaySender(),
      to: [process.env.INBOUND_RECIPIENT ?? "replay@fixture.local"],
      subject: `Replay: ${fixture}`,
      created_at: new Date().toISOString(),
    },
  });

  const headers = signSvixPayload(
    payload,
    secret,
    `msg_${randomUUID()}`,
    Math.floor(Date.now() / 1000),
  );

  // Absolute path on purpose. A relative "../inbound" from `/api/replay`
  // resolves to `/…/inbound` — it eats the `api` segment — which 404s into
  // Next's HTML error page and then fails as "Unexpected token '<'".
  const inbound = new URL(
    "/python-sdk/email-extraction-pipeline/api/inbound",
    request.url,
  );
  const res = await fetch(inbound, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: payload,
  });

  return NextResponse.json(
    {
      replayed: fixture,
      emailId,
      inboundStatus: res.status,
      // The inbound route always answers JSON, but read defensively: if it ever
      // 404s or throws, an HTML error page here would surface as a confusing
      // JSON parse error rather than the status that actually explains it.
      inbound: await res.json().catch(() => ({ unparsed: true })),
    },
    { status: res.ok ? 200 : 502 },
  );
}

export function GET() {
  return NextResponse.json({ fixtures: fixtureIds() });
}
