/**
 * Sign a fixture payload the way Resend does, and POST it at the inbound route.
 *
 * This is the keystone of the sample's testability. Every acceptance criterion
 * about the webhook — valid signature, tampered body, stale timestamp, duplicate
 * delivery, the insert-then-start()-failed recovery — is only reachable if you
 * can produce valid Svix headers for an arbitrary body. You cannot test fourteen
 * failure modes by sending fourteen emails, and you certainly cannot do it in CI.
 *
 * It is also the demo's front door: a visitor cannot replicate "mail arrives at
 * my inbound address" without their own Resend domain and DNS, so replaying a
 * fixture is how most people will ever see this pipeline run.
 *
 *   pnpm tsx scripts/email-extraction-pipeline/sign-and-post.ts clean-invoice
 *   ... --tamper          body altered after signing -> expect 401
 *   ... --stale           timestamp 10 minutes old   -> expect 401
 *   ... --twice           same payload twice          -> expect 200 then duplicate
 *   ... --url <url>       default http://localhost:3000/...
 */

import { createHmac, randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(
  HERE,
  "../../app/python-sdk/email-extraction-pipeline/fixtures/payloads",
);
const DEFAULT_URL =
  "http://localhost:3000/python-sdk/email-extraction-pipeline/api/inbound";

function sign(rawBody: string, secret: string, id: string, ts: number) {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signature = createHmac("sha256", key)
    .update(`${id}.${ts}.${rawBody}`)
    .digest("base64");
  return {
    "svix-id": id,
    "svix-timestamp": String(ts),
    "svix-signature": `v1,${signature}`,
    "content-type": "application/json",
  };
}

async function post(
  rawBody: string,
  headers: Record<string, string>,
  url: string,
) {
  const res = await fetch(url, { method: "POST", headers, body: rawBody });
  const text = await res.text();
  return { status: res.status, body: text.slice(0, 300) };
}

async function main() {
  const args = process.argv.slice(2);
  const name = args.find((a) => !a.startsWith("--"));
  const flag = (f: string) => args.includes(`--${f}`);
  const url = args.includes("--url")
    ? args[args.indexOf("--url") + 1]
    : (process.env.INBOUND_URL ?? DEFAULT_URL);

  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      "RESEND_WEBHOOK_SECRET is not set. Any whsec_-prefixed base64 value works " +
        "locally, as long as the server and this script agree.",
    );
    process.exit(1);
  }

  if (!name) {
    const available = (await readdir(FIXTURES)).map((f) =>
      f.replace(/\.json$/, ""),
    );
    console.error(
      `usage: sign-and-post.ts <fixture> [--tamper|--stale|--twice]\n`,
    );
    console.error(`fixtures: ${available.join(", ")}`);
    process.exit(1);
  }

  const payload = await readFile(join(FIXTURES, `${name}.json`), "utf8");
  const parsed = JSON.parse(payload);

  // Address it to whatever inbox this deployment owns, unless the fixture names
  // a recipient itself — which is how `wrong-recipient` exercises the filter.
  // Without this every fixture would be rejected as another consumer's mail the
  // moment INBOUND_RECIPIENT is configured.
  if (parsed?.data && !parsed.data.to && process.env.INBOUND_RECIPIENT) {
    parsed.data.to = [process.env.INBOUND_RECIPIENT];
  }

  // Likewise for the sender. Fixtures carry realistic vendor addresses, which a
  // domain allowlist correctly rejects — so pass `--from`, or let the allowlist
  // supply one, when the point of the run is what happens AFTER the gate.
  const fromFlag = args.includes("--from")
    ? args[args.indexOf("--from") + 1]
    : process.env.REPLAY_FROM;
  if (parsed?.data && fromFlag) parsed.data.from = fromFlag;

  // Sign the exact bytes that will be sent. Re-serialising here would reproduce
  // the bug this script exists to catch on the server side.
  const rawBody = JSON.stringify(parsed);

  const ts = Math.floor(Date.now() / 1000) - (flag("stale") ? 600 : 0);
  const headers = sign(rawBody, secret, `msg_${randomUUID()}`, ts);

  // Tamper AFTER signing: valid headers, different body. This is the case a
  // leniently-written verifier waves through.
  const sent = flag("tamper")
    ? rawBody.replace(/"subject":\s*"[^"]*"/, '"subject":"tampered"')
    : rawBody;

  const expectation = flag("tamper")
    ? "expect 401 (body altered after signing)"
    : flag("stale")
      ? "expect 401 (timestamp outside the 5-minute window)"
      : "expect 200";

  console.log(`POST ${url}\n  fixture: ${name}  —  ${expectation}`);
  const first = await post(sent, headers, url);
  console.log(`  -> ${first.status} ${first.body}`);

  if (flag("twice")) {
    // A fresh signature, same payload: exactly what a Resend retry looks like.
    const retryHeaders = sign(
      sent,
      secret,
      `msg_${randomUUID()}`,
      Math.floor(Date.now() / 1000),
    );
    const second = await post(sent, retryHeaders, url);
    console.log(`  retry -> ${second.status} ${second.body}`);
    if (!second.body.includes("duplicate")) {
      console.error("  FAIL: the retry was not recognised as a duplicate");
      process.exitCode = 1;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
