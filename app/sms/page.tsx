import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageHeader } from "@/app/_components/PageHeader";
import {
  FREQUENCY_DISCLOSURE,
  LEGAL,
  RATES_DISCLOSURE,
  SAMPLE_MESSAGES,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Text Message Notifications",
  description: `How the ${LEGAL.appName} text message notification program works, including how to opt in and opt out.`,
};

const READING = { maxWidth: "var(--reading-max)" } as const;
const SECTION = { marginTop: "var(--space-7)" } as const;

// The opt-in screen sits behind Google sign-in, so it cannot be reached by
// anyone without an account. This page documents the flow in the open, carries a
// screenshot of the screen itself, and is the reference the campaign
// registration points at.
const SCREENSHOT_SLOT = {
  marginTop: "var(--space-5)",
  padding: "var(--space-6)",
  border: "1px solid var(--line-strong)",
  borderRadius: "var(--radius-lg)",
  background: "var(--bg-elev)",
  textAlign: "center",
} as const;

// The screenshot is a tall, narrow column, so it is capped rather than stretched
// to the full reading width.
const SCREENSHOT_IMAGE = {
  width: "100%",
  maxWidth: "420px",
  height: "auto",
  borderRadius: "var(--radius-lg)",
} as const;

const CAPTION = {
  marginTop: "var(--space-5)",
  textAlign: "left",
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
            <li>
              Sign in to {LEGAL.appDomain}. {LEGAL.appName} is an internal
              application, so sign-in is limited to <code>nutrient.io</code> and{" "}
              <code>pspdfkit.com</code> accounts &mdash; a personal Google
              account is refused. The opt-in screen is reproduced below, and{" "}
              <a href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a>{" "}
              will walk anyone who needs to verify it through the flow directly.
            </li>
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
            <Image
              src="/bindery-sms-optin.png"
              alt={`The ${LEGAL.appName} Settings > Notifications opt-in screen: text notifications off by default, the program disclosures, links to the terms of service and privacy policy, a four-character single-use code, and ${LEGAL.messagingNumber} as the number to text it to`}
              width={755}
              height={797}
              style={SCREENSHOT_IMAGE}
            />
            {/* The written description stays as a caption. It is what a
                reviewer reads if the image fails to load, and it is the part
                that has to keep matching the screen. */}
            <p style={CAPTION}>
              <strong>What the opt-in screen shows.</strong> Under{" "}
              <strong>Settings &rarr; Notifications</strong>, {LEGAL.appName}{" "}
              states that text notifications are off and that it never texts a
              number until that number has texted first. Alongside the opt-in
              control it repeats every disclosure on this page &mdash; what the
              messages are, how often they come, that message and data rates may
              apply, that STOP opts out and HELP gets help, and that consent is
              not a condition of use &mdash; and links the terms of service and
              the privacy policy. Choosing <em>Set up text notifications</em>{" "}
              then names the number to text and shows a four-character
              single-use code beneath it, good for ten minutes and usable once.
              There is no field to type a phone number into.
            </p>
          </div>

          <h2 className="h2" style={SECTION}>
            Example messages
          </h2>
          {/* Rendered from SAMPLE_MESSAGES rather than retyped here. These are
              the exact strings filed with the campaign and sent by the
              application; restating them as prose is what let them drift twice. */}
          <ul>
            {SAMPLE_MESSAGES.map((sample) => (
              <li key={sample.label}>
                {sample.label}:
                <br />
                <span className="mono">{sample.text}</span>
              </li>
            ))}
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
