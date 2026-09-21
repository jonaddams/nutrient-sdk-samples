import { describe, expect, it } from "vitest";

/**
 * Recipient and sender routing.
 *
 * Inbound mail for a domain fans out to EVERY webhook endpoint subscribed to
 * `email.received`, so "is this message mine?" is a real question rather than a
 * formality. Getting it wrong is quiet: a second sample sharing the domain would
 * have each pipeline ingesting the other's mail.
 *
 * The functions under test are duplicated from api/inbound/route.ts rather than
 * exported from it — a Next route module cannot be imported into a test without
 * dragging in the workflow runtime and a database pool. Keeping them in step is
 * the price; these assertions are what catches a divergence.
 */

function bareAddress(value: string): string {
  const v = value.trim().toLowerCase();
  return v.match(/<([^>]+)>/)?.[1] ?? v;
}

function toList(value: string[] | string | undefined | null): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : value.split(",")).map(bareAddress);
}

interface Data {
  to?: string[] | string;
  cc?: string[] | string;
  received_for?: string[] | string;
}

function addressedToUs(data: Data, ours: string | undefined): boolean {
  const mine = ours?.trim().toLowerCase();
  if (!mine) return true;
  return [
    ...toList(data.received_for),
    ...toList(data.to),
    ...toList(data.cc),
  ].includes(bareAddress(mine));
}

const OURS = "invoices@abc123.resend.app";

describe("bareAddress", () => {
  it("unwraps a display-name form", () => {
    expect(bareAddress("Jon Addams <Jon@JonAddams.com>")).toBe(
      "jon@jonaddams.com",
    );
  });
  it("passes a bare address through, lowercased", () => {
    expect(bareAddress("  Billing@Vendor.Example ")).toBe(
      "billing@vendor.example",
    );
  });
});

describe("addressedToUs", () => {
  it("accepts everything when no recipient is configured", () => {
    // Right for local development, wrong in a deployment — the README says so.
    expect(addressedToUs({ to: "someone@else.example" }, undefined)).toBe(true);
  });

  it("accepts a message addressed to our inbox", () => {
    expect(addressedToUs({ to: [OURS] }, OURS)).toBe(true);
  });

  it("rejects another consumer's mail on the same domain", () => {
    // The case this whole check exists for. A second sample receiving email
    // would otherwise have its traffic stamped `failed` by this pipeline.
    expect(addressedToUs({ to: ["intake@abc123.resend.app"] }, OURS)).toBe(
      false,
    );
  });

  it("accepts when ours is one of several recipients", () => {
    expect(
      addressedToUs(
        { to: ["someone@else.example", `Invoices <${OURS}>`] },
        OURS,
      ),
    ).toBe(true);
  });

  it("accepts a comma-joined recipient string", () => {
    expect(addressedToUs({ to: `a@b.example, ${OURS}` }, OURS)).toBe(true);
  });

  it("accepts when we are only on cc", () => {
    expect(addressedToUs({ to: ["x@y.example"], cc: [OURS] }, OURS)).toBe(true);
  });

  it("accepts on the envelope recipient even when no header names us", () => {
    // bcc, a forward, or a mailing list: the message genuinely arrived for us
    // while every visible header names somebody else.
    expect(
      addressedToUs(
        { to: ["list@elsewhere.example"], received_for: [OURS] },
        OURS,
      ),
    ).toBe(true);
  });

  it("is case-insensitive on both sides", () => {
    expect(addressedToUs({ to: ["INVOICES@ABC123.RESEND.APP"] }, OURS)).toBe(
      true,
    );
  });

  it("rejects when there are no recipients at all", () => {
    expect(addressedToUs({}, OURS)).toBe(false);
  });
});

function senderAllowed(from: string | null, raw: string | undefined): boolean {
  const list = raw?.trim();
  if (!list) return true;
  if (!from) return false;
  const address = bareAddress(from);
  return list
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .some((e) => (e.startsWith("@") ? address.endsWith(e) : address === e));
}

describe("senderAllowed", () => {
  it("allows any sender when the allowlist is empty", () => {
    expect(senderAllowed("anyone@anywhere.example", "")).toBe(true);
  });
  it("matches an exact address", () => {
    expect(
      senderAllowed("billing@vendor.example", "billing@vendor.example"),
    ).toBe(true);
  });
  it("matches a domain entry", () => {
    expect(senderAllowed("ap@vendor.example", "@vendor.example")).toBe(true);
  });
  it("rejects a sender outside the list", () => {
    expect(senderAllowed("stranger@elsewhere.example", "@vendor.example")).toBe(
      false,
    );
  });
  it("does not let a lookalike domain through", () => {
    // "@vendor.example" must not match "evil-vendor.example".
    expect(senderAllowed("x@notvendor.example", "@vendor.example")).toBe(false);
  });
  it("allows a whole company domain", () => {
    const list = "@nutrient.io";
    expect(senderAllowed("jon.addams@nutrient.io", list)).toBe(true);
    expect(senderAllowed("anyone.else@nutrient.io", list)).toBe(true);
    expect(senderAllowed("Jon Addams <Jon.Addams@Nutrient.IO>", list)).toBe(
      true,
    );
  });

  it("does not let a domain entry match a longer lookalike", () => {
    // The leading "@" is what makes the suffix match safe: without it,
    // "nutrient.io" would also match "evilnutrient.io".
    expect(senderAllowed("attacker@evilnutrient.io", "@nutrient.io")).toBe(
      false,
    );
    expect(senderAllowed("attacker@nutrient.io.evil.com", "@nutrient.io")).toBe(
      false,
    );
  });

  it("does not match a subdomain of an allowed domain", () => {
    // Deliberately strict. Add "@mail.nutrient.io" explicitly if it is wanted.
    expect(senderAllowed("bot@mail.nutrient.io", "@nutrient.io")).toBe(false);
  });

  it("accepts several entries, mixing domains and exact addresses", () => {
    const list = "@nutrient.io, billing@vendor.example";
    expect(senderAllowed("jon@nutrient.io", list)).toBe(true);
    expect(senderAllowed("billing@vendor.example", list)).toBe(true);
    expect(senderAllowed("someone@vendor.example", list)).toBe(false);
  });

  it("unwraps a display-name sender before matching", () => {
    expect(
      senderAllowed("Vendor AP <ap@vendor.example>", "@vendor.example"),
    ).toBe(true);
  });
});
