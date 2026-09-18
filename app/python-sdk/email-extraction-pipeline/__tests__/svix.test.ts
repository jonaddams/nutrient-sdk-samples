import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signSvixPayload, verifySvixSignature } from "../_lib/svix";

// Webhook signature verification is the one place in this sample where a bug is
// both silent and serious: a leniently-written verifier accepts forged payloads
// and nothing about the system looks wrong. These cases are the reason the
// fixture harness exists — none of them are reachable by sending real email.

const SECRET = `whsec_${randomBytes(24).toString("base64")}`;
const BODY = JSON.stringify({
  type: "email.received",
  data: { email_id: "x1" },
});

function headersFor(
  body: string,
  secret = SECRET,
  id = "msg_1",
  ts = Math.floor(Date.now() / 1000),
) {
  return new Headers(signSvixPayload(body, secret, id, ts));
}

describe("verifySvixSignature", () => {
  it("accepts a correctly signed payload", () => {
    expect(verifySvixSignature(BODY, headersFor(BODY), SECRET).ok).toBe(true);
  });

  it("rejects a body altered after signing", () => {
    const tampered = BODY.replace("x1", "x2");
    expect(verifySvixSignature(tampered, headersFor(BODY), SECRET).ok).toBe(
      false,
    );
  });

  it("rejects a payload signed with a different secret", () => {
    const other = `whsec_${randomBytes(24).toString("base64")}`;
    expect(verifySvixSignature(BODY, headersFor(BODY, other), SECRET).ok).toBe(
      false,
    );
  });

  it("rejects a timestamp outside the five-minute window", () => {
    const stale = Math.floor(Date.now() / 1000) - 600;
    const headers = headersFor(BODY, SECRET, "msg_1", stale);
    expect(verifySvixSignature(BODY, headers, SECRET).ok).toBe(false);
  });

  it("rejects when svix-id differs from the one that was signed", () => {
    const headers = headersFor(BODY);
    headers.set("svix-id", "msg_2");
    expect(verifySvixSignature(BODY, headers, SECRET).ok).toBe(false);
  });

  it("rejects when any required header is missing", () => {
    expect(verifySvixSignature(BODY, new Headers(), SECRET).ok).toBe(false);
  });

  it("accepts when one of several signatures matches", () => {
    // Svix sends more than one during a secret rotation. Checking only the first
    // would reject live traffic for the length of the rotation.
    const valid = signSvixPayload(
      BODY,
      SECRET,
      "msg_1",
      Math.floor(Date.now() / 1000),
    );
    const headers = new Headers({
      ...valid,
      "svix-signature": `v1,AAAA ${valid["svix-signature"]}`,
    });
    expect(verifySvixSignature(BODY, headers, SECRET).ok).toBe(true);
  });

  it("rejects a semantically equal body with different bytes", () => {
    // The re-serialisation trap: `await req.json()` then JSON.stringify produces
    // a body that means the same thing and hashes differently. Verification must
    // run against the exact bytes received.
    const spaced = '{ "type": "email.received", "data": { "email_id": "x1" } }';
    expect(JSON.parse(spaced)).toEqual(JSON.parse(BODY));
    expect(verifySvixSignature(spaced, headersFor(BODY), SECRET).ok).toBe(
      false,
    );
  });
});
