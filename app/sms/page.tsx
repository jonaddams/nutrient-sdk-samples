import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/app/_components/PageHeader";
import { FREQUENCY_DISCLOSURE, LEGAL, RATES_DISCLOSURE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Text Message Notifications",
  description: `How the ${LEGAL.appName} text message notification program works, including how to opt in and opt out.`,
};

const READING = { maxWidth: "var(--reading-max)" } as const;
const SECTION = { marginTop: "var(--space-7)" } as const;

// The opt-in screen sits behind Google sign-in, so it cannot be reached by
// anyone without an account. This page documents the flow in the open and is
// the reference the campaign registration points at.
const SCREENSHOT_SLOT = {
  marginTop: "var(--space-5)",
  padding: "var(--space-6)",
  border: "1px dashed var(--line-strong)",
  borderRadius: "var(--radius-lg)",
  background: "var(--bg-elev)",
  textAlign: "center",
} as const;

export default function SmsPage() {
  return (
    <>
      <PageHeader
        title="Text Message Notifications"
        description={`How the ${LEGAL.appName} notification program works`}
      />
      <section className="shell">
        <div style={READING}>
          <h2 className="h2">What the program is</h2>
          <p>
            {LEGAL.appName} ({LEGAL.appDomain}) is a document application
            operated by {LEGAL.brand}. It can send you a text message when
            something happens to a document you already have access to — most
            commonly when a colleague mentions you in a comment, and in future
            when document processing you started has finished.
          </p>
          <p>
            Text notifications are <strong>off by default</strong>. Nothing is
            ever sent to a number until that number has texted us first.
          </p>

          <h2 className="h2" style={SECTION}>
            How to opt in
          </h2>
          <p>
            Registration is deliberately inbound: you send us a message, we
            never send one to an unconfirmed number.
          </p>
          <ol>
            <li>Sign in to {LEGAL.appDomain} with your Google account.</li>
            <li>
              Open <strong>Settings &rarr; Notifications</strong>. A short,
              single-use code is displayed there, along with the number to send
              it to.
            </li>
            <li>
              From the mobile number you want to register, text that code to{" "}
              <strong>{LEGAL.messagingNumber}</strong>.
            </li>
            <li>
              We match the code to your account and reply once to confirm. That
              inbound message is the record of your consent; we store the
              number, the message and the time it arrived.
            </li>
          </ol>
          <p className="muted">
            You are never asked to type a phone number into a form, so a number
            cannot be registered by anyone other than the person holding the
            handset.
          </p>

          <div style={SCREENSHOT_SLOT}>
            <p className="muted">
              [ Screenshot of the Settings &rarr; Notifications opt-in screen
              goes here before the campaign is submitted. ]
            </p>
          </div>

          <h2 className="h2" style={SECTION}>
            Example messages
          </h2>
          <ul>
            <li className="mono">
              {LEGAL.appName}: Your number is registered. You&apos;ll get a text
              when someone mentions you in a document comment. Reply HELP for
              help, STOP to cancel.
            </li>
            <li className="mono">
              {LEGAL.appName}: Jon mentioned you in a comment on &ldquo;Q3
              Contract Review&rdquo;. Reply STOP to opt out.
            </li>
          </ul>

          <h2 className="h2" style={SECTION}>
            Cost and frequency
          </h2>
          <p>
            The program is free to join. {RATES_DISCLOSURE}{" "}
            {FREQUENCY_DISCLOSURE} Messages are sent only in response to
            activity, so how many you receive depends on your own use of the
            application.
          </p>

          <h2 className="h2" style={SECTION}>
            How to opt out or get help
          </h2>
          <ul>
            <li>
              <strong>Reply STOP</strong> to any message. Messages end
              immediately and your number is deleted. Nothing further is sent
              unless you register again.
            </li>
            <li>
              <strong>Reply HELP</strong> to any message for a description of
              the program and how to reach support.
            </li>
            <li>
              Or email{" "}
              <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>.
            </li>
          </ul>
          <p>
            No marketing messages are sent, and consent is never a condition of
            using the application.
          </p>

          <p className="muted" style={SECTION}>
            See the <Link href="/privacy">privacy policy</Link> and the{" "}
            <Link href="/terms">terms of service</Link>.
          </p>
        </div>
      </section>
    </>
  );
}
