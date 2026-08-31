import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/app/_components/PageHeader";
import { CARRIER_NO_SHARING_CLAUSE, LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${LEGAL.brand} handles data across ${LEGAL.domain} and its subdomains.`,
};

const READING = { maxWidth: "var(--reading-max)" } as const;
const SECTION = { marginTop: "var(--space-7)" } as const;

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        title="Privacy Policy"
        description={`Effective ${LEGAL.effectiveDate}`}
      />
      <section className="shell">
        <div style={READING}>
          <h2 className="h2">Scope</h2>
          <p>
            This policy is published by {LEGAL.brand} and covers{" "}
            <strong>{LEGAL.domain} and all of its subdomains</strong>, including
            the {LEGAL.appName} application at {LEGAL.appDomain}. Each subdomain
            is operated by {LEGAL.brand}; there is no separate policy for any of
            them.
          </p>
          <p className="muted">
            These are personal demonstration projects that showcase document
            processing SDKs. They are not sold as products and carry no
            advertising.
          </p>

          <h2 className="h2" style={SECTION}>
            What is collected
          </h2>
          <p>
            <strong>Account details.</strong> Signing in uses Google. Google
            returns a name, an email address and an account identifier. No
            password is ever received or stored.
          </p>
          <p>
            <strong>Documents you upload.</strong> Files are stored to support
            the features being demonstrated — viewing, commenting, and document
            processing such as text recognition or data extraction.
          </p>
          <p>
            <strong>A mobile number, only if you send one.</strong> Text message
            notifications are off by default. A number is recorded only when you
            text a verification code to {LEGAL.messagingNumber} from that
            number. What is kept is the number, the message that registered it,
            and the time it arrived — retained as the record of your consent.
            You are never asked to type a phone number into a form, so no one
            can register a number that is not theirs.
          </p>

          <h2 className="h2" style={SECTION}>
            Text messages
          </h2>
          <p>{CARRIER_NO_SHARING_CLAUSE}</p>
          <p>
            Messages are sent only to notify you about activity on documents you
            already have access to. No marketing messages are sent. You can stop
            them at any time by replying STOP, which takes effect immediately
            and permanently until you register again. Full program details are
            on the <Link href="/sms">text message program page</Link>.
          </p>

          <h2 className="h2" style={SECTION}>
            Services that process this data
          </h2>
          <p>
            These projects are built on third-party services, and data
            necessarily passes through them. Each acts only on instructions
            given by these applications:
          </p>
          <ul>
            <li>
              <strong>Nutrient</strong> — document storage, viewing and
              processing.
            </li>
            <li>
              <strong>Vercel</strong> — application hosting.
            </li>
            <li>
              <strong>Neon</strong> — the database holding accounts and document
              records.
            </li>
            <li>
              <strong>Google</strong> — sign-in.
            </li>
            <li>
              <strong>Resend</strong> — sending and receiving email
              notifications.
            </li>
            <li>
              <strong>Twilio</strong> — sending and receiving text messages.
            </li>
          </ul>
          <p>
            Data is not sold, and it is not shared with anyone else for their
            own purposes.
          </p>

          <h2 className="h2" style={SECTION}>
            Keeping and deleting data
          </h2>
          <p>
            Documents and account records are kept until you delete them or ask
            for the account to be removed. A registered mobile number is deleted
            when you reply STOP or ask for it to be removed. Because these are
            demonstration projects, assume anything uploaded may be seen by the
            operator during maintenance, and do not upload anything genuinely
            confidential.
          </p>

          <h2 className="h2" style={SECTION}>
            Your choices
          </h2>
          <ul>
            <li>Reply STOP to any text message to end text notifications.</li>
            <li>Reply HELP to any text message for help.</li>
            <li>
              Email{" "}
              <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>{" "}
              to see, correct or delete what is held about you.
            </li>
          </ul>

          <h2 className="h2" style={SECTION}>
            Contact and changes
          </h2>
          <p>
            Questions about this policy go to{" "}
            <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
            If this policy changes materially, the effective date above changes
            with it.
          </p>
          <p className="muted" style={SECTION}>
            See also the <Link href="/terms">terms of service</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
