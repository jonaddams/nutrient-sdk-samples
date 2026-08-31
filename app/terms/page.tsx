import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/app/_components/PageHeader";
import { FREQUENCY_DISCLOSURE, LEGAL, RATES_DISCLOSURE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms for ${LEGAL.domain} and its subdomains, including the text message notification program.`,
};

const READING = { maxWidth: "var(--reading-max)" } as const;
const SECTION = { marginTop: "var(--space-7)" } as const;

export default function TermsPage() {
  return (
    <>
      <PageHeader
        title="Terms of Service"
        description={`Effective ${LEGAL.effectiveDate}`}
      />
      <section className="shell">
        <div style={READING}>
          <h2 className="h2">What this covers</h2>
          <p>
            These terms apply to {LEGAL.domain} and all of its subdomains,
            including the {LEGAL.appName} application at {LEGAL.appDomain}, all
            operated by {LEGAL.brand}. Using any of them means accepting these
            terms.
          </p>
          <p className="muted">
            These are demonstration projects showing how document processing
            SDKs can be assembled into working applications. They are provided
            as-is, with no warranty and no service level, and may change or go
            offline without notice. Do not rely on them to store anything you
            cannot afford to lose, and do not upload confidential material.
          </p>

          <h2 className="h2" style={SECTION}>
            Text message notification program
          </h2>
          <p>
            {LEGAL.appName} can notify you by text message about activity on
            documents you already have access to — for example when someone
            mentions you in a comment, or when processing you requested has
            finished. The program is operated by {LEGAL.brand}.
          </p>
          <ul>
            <li>
              <strong>Who can join.</strong> Signed-in account holders with a
              mobile number in the United States.
            </li>
            <li>
              <strong>How to join.</strong> Text the verification code shown in
              the application to {LEGAL.messagingNumber}. That message is your
              consent. See the{" "}
              <Link href="/sms">text message program page</Link> for the full
              flow.
            </li>
            <li>
              <strong>How often.</strong> {FREQUENCY_DISCLOSURE} Messages are
              sent in response to activity, so the number depends entirely on
              your own use.
            </li>
            <li>
              <strong>Cost.</strong> The program is free. {RATES_DISCLOSURE}
            </li>
            <li>
              <strong>To stop.</strong> Reply STOP to any message. This ends all
              messages immediately.
            </li>
            <li>
              <strong>For help.</strong> Reply HELP to any message, or email{" "}
              <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
            </li>
          </ul>
          <p>
            Carriers are not liable for delayed or undelivered messages. Message
            delivery depends on your carrier and your device, and cannot be
            guaranteed.
          </p>
          <p>
            No marketing messages are sent through this program. Consent to
            receive notifications is not a condition of using the application —
            everything works the same with notifications turned off.
          </p>

          <h2 className="h2" style={SECTION}>
            Acceptable use
          </h2>
          <p>
            Do not upload content you have no right to share, attempt to reach
            other people&apos;s documents, or use these applications to send
            unsolicited messages. Access may be withdrawn at any time.
          </p>

          <h2 className="h2" style={SECTION}>
            Liability
          </h2>
          <p>
            These applications are provided without warranty of any kind. To the
            fullest extent the law allows, {LEGAL.brand} is not liable for any
            loss arising from their use, including lost documents or missed
            notifications.
          </p>

          <h2 className="h2" style={SECTION}>
            Contact
          </h2>
          <p>
            Questions about these terms go to{" "}
            <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
          </p>
          <p className="muted" style={SECTION}>
            See also the <Link href="/privacy">privacy policy</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
