import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Svix webhook signature verification, as Resend sends it.
 *
 * The signed payload is `${svix-id}.${svix-timestamp}.${rawBody}`, HMAC-SHA256
 * with the base64 secret that follows the `whsec_` prefix, compared base64.
 *
 * Verify against the RAW request body. `await req.text()` first, then
 * JSON.parse that same string — never `await req.json()` and re-serialise. Key
 * order, whitespace and unicode escapes all change under a round trip, so a
 * re-serialised body either fails every time or, if the check is written
 * leniently to "fix" that, passes everything. This is the single most common
 * way this route ends up accepting forged webhooks.
 */

const TOLERANCE_SECONDS = 5 * 60;

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export function verifySvixSignature(
  rawBody: string,
  headers: Headers,
  secret: string,
  now: Date = new Date(),
): VerifyResult {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signature = headers.get("svix-signature");

  if (!id || !timestamp || !signature) {
    return {
      ok: false,
      reason: "missing svix-id, svix-timestamp or svix-signature",
    };
  }

  const sent = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(sent)) {
    return { ok: false, reason: "svix-timestamp is not an integer" };
  }
  // Replay window. Without it a captured payload stays valid forever.
  const drift = Math.abs(Math.floor(now.getTime() / 1000) - sent);
  if (drift > TOLERANCE_SECONDS) {
    return {
      ok: false,
      reason: `timestamp outside ${TOLERANCE_SECONDS}s window`,
    };
  }

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest("base64");

  // The header carries space-separated `v1,<sig>` pairs and may hold more than
  // one — Svix sends both during a secret rotation, so accepting only the first
  // would reject live traffic for the length of the rotation.
  const candidates = signature
    .split(" ")
    .map((part) => part.split(",", 2)[1])
    .filter((v): v is string => Boolean(v));

  if (candidates.length === 0) {
    return { ok: false, reason: "no v1 signature in svix-signature" };
  }

  const expectedBuf = Buffer.from(expected, "base64");
  for (const candidate of candidates) {
    const candidateBuf = Buffer.from(candidate, "base64");
    // timingSafeEqual throws on a length mismatch rather than returning false.
    if (
      candidateBuf.length === expectedBuf.length &&
      timingSafeEqual(candidateBuf, expectedBuf)
    ) {
      return { ok: true };
    }
  }
  return { ok: false, reason: "no candidate signature matched" };
}

/** Sign a payload the way Resend would. Used by the fixture replay tooling. */
export function signSvixPayload(
  rawBody: string,
  secret: string,
  id: string,
  timestampSeconds: number,
): Record<string, string> {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signature = createHmac("sha256", key)
    .update(`${id}.${timestampSeconds}.${rawBody}`)
    .digest("base64");
  return {
    "svix-id": id,
    "svix-timestamp": String(timestampSeconds),
    "svix-signature": `v1,${signature}`,
  };
}
