import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PrivacyPage from "@/app/privacy/page";
import SmsPage from "@/app/sms/page";
import TermsPage from "@/app/terms/page";
import { CARRIER_NO_SHARING_CLAUSE, LEGAL } from "@/lib/legal";

// These assertions exist because US carriers reject an A2P 10DLC campaign whose
// privacy policy or terms omit specific language. They are a guard against the
// clauses being paraphrased or dropped during an unrelated content edit.

describe("privacy policy", () => {
  it("states the carrier-required non-sharing clause verbatim", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByText(CARRIER_NO_SHARING_CLAUSE, { exact: false }),
    ).toBeTruthy();
  });

  it("declares that it covers subdomains, not just the root domain", () => {
    render(<PrivacyPage />);
    const body = document.body.textContent ?? "";
    expect(body).toContain("subdomain");
    expect(body).toContain(LEGAL.appDomain);
  });

  it("names the services that receive data", () => {
    render(<PrivacyPage />);
    const body = document.body.textContent ?? "";
    for (const processor of ["Twilio", "Resend", "Nutrient", "Vercel"]) {
      expect(body).toContain(processor);
    }
  });
});

describe("terms of service", () => {
  it("carries the disclosures a messaging program must publish", () => {
    render(<TermsPage />);
    const body = document.body.textContent ?? "";
    expect(body).toContain("Message and data rates may apply.");
    expect(body).toContain("Message frequency varies.");
    expect(body).toContain("HELP");
    expect(body).toContain("STOP");
  });

  it("disclaims carrier liability for undelivered messages", () => {
    render(<TermsPage />);
    const body = document.body.textContent ?? "";
    expect(body.toLowerCase()).toContain(
      "not liable for delayed or undelivered",
    );
  });
});

describe("sms program page", () => {
  it("describes the opt-in a reviewer cannot reach behind authentication", () => {
    render(<SmsPage />);
    const body = document.body.textContent ?? "";
    expect(body).toContain(LEGAL.messagingNumber);
    expect(body).toContain("STOP");
    expect(body.toLowerCase()).toContain("opt-in");
  });

  it("links to the privacy policy and terms", () => {
    render(<SmsPage />);
    const hrefs = Array.from(document.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toContain("/privacy");
    expect(hrefs).toContain("/terms");
  });
});
