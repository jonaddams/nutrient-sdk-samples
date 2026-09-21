/**
 * Read SPF/DKIM/DMARC results out of a received email's headers.
 *
 * Why this exists: `INBOUND_SENDER_ALLOWLIST` matches on the `From` header, and
 * `From` is trivially forgeable. On its own the allowlist is a naming convention,
 * not a control — anyone who learns the inbound address can claim to be
 * `@nutrient.io`. DMARC is what makes the allowlist mean something, because it
 * ties the `From` domain to an SPF or DKIM result the sender cannot fake.
 *
 * Resend performs these checks and records them in the message's
 * `Authentication-Results` header. We only read them.
 */

export type AuthVerdict = "pass" | "fail" | "unknown";

export interface AuthResults {
  dmarc: AuthVerdict;
  spf: AuthVerdict;
  dkim: AuthVerdict;
  /** The raw header, kept so a surprising verdict can be investigated. */
  raw: string | null;
}

/**
 * Headers arrive in more than one shape depending on the API surface, so accept
 * all of them rather than guessing: a record, an array of {name,value}, or an
 * array of raw "Name: value" strings.
 */
type HeaderInput =
  | Record<string, string | string[]>
  | { name?: string; key?: string; value?: string }[]
  | string[]
  | null
  | undefined;

function findHeader(headers: HeaderInput, want: string): string | null {
  if (!headers) return null;
  const target = want.toLowerCase();

  if (Array.isArray(headers)) {
    const found: string[] = [];
    for (const entry of headers) {
      if (typeof entry === "string") {
        const idx = entry.indexOf(":");
        if (idx > 0 && entry.slice(0, idx).trim().toLowerCase() === target) {
          found.push(entry.slice(idx + 1).trim());
        }
        continue;
      }
      const name = (entry?.name ?? entry?.key ?? "").toLowerCase();
      if (name === target && entry?.value) found.push(entry.value);
    }
    // A message can carry several Authentication-Results headers (one per hop).
    return found.length ? found.join("; ") : null;
  }

  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === target) {
      return Array.isArray(v) ? v.join("; ") : v;
    }
  }
  return null;
}

function verdictFor(raw: string, method: string): AuthVerdict {
  // e.g. "dmarc=pass header.from=nutrient.io" / "spf=softfail (...)"
  const m = raw
    .toLowerCase()
    .match(new RegExp(`\\b${method}\\s*=\\s*([a-z]+)`));
  if (!m) return "unknown";
  return m[1] === "pass" ? "pass" : "fail";
}

export function parseAuthResults(headers: HeaderInput): AuthResults {
  const raw = findHeader(headers, "authentication-results");
  if (!raw)
    return { dmarc: "unknown", spf: "unknown", dkim: "unknown", raw: null };
  return {
    dmarc: verdictFor(raw, "dmarc"),
    spf: verdictFor(raw, "spf"),
    dkim: verdictFor(raw, "dkim"),
    raw,
  };
}

/**
 * Should this message be treated as genuinely from the domain it claims?
 *
 * Deliberately fail-OPEN on `unknown`, and that is a real weakening worth stating
 * plainly: if the header is absent or shaped differently than expected, we accept
 * the message and flag it rather than rejecting it. Fail-closed on an unverified
 * assumption about a header format would reject every email the first time the
 * shape changed — a demo that silently stops working is worse here than one that
 * over-accepts behind a rate cap and a restricted address.
 *
 * `fail` is different from `unknown`: it means the checks ran and the sender did
 * not own the domain. That is refused.
 */
export function senderIsAuthentic(auth: AuthResults): {
  ok: boolean;
  reason: string | null;
  verified: boolean;
} {
  if (auth.dmarc === "fail") {
    return { ok: false, reason: "dmarc_fail", verified: true };
  }
  if (auth.dmarc === "pass") return { ok: true, reason: null, verified: true };

  // No DMARC verdict. SPF or DKIM passing still ties the message to the domain.
  if (auth.spf === "pass" || auth.dkim === "pass") {
    return { ok: true, reason: null, verified: true };
  }
  if (auth.spf === "fail" && auth.dkim === "fail") {
    return { ok: false, reason: "spf_and_dkim_fail", verified: true };
  }
  return { ok: true, reason: null, verified: false };
}
