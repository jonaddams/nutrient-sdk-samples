// Shared facts for the site's legal and messaging-program pages. These values
// appear in an A2P 10DLC campaign registration, so the pages and the
// registration must agree; change them here rather than in the pages.

export const LEGAL = {
  brand: "Jon Addams",
  domain: "jonaddams.com",
  contactEmail: "support@jonaddams.com",
  appName: "Bindery",
  appDomain: "bindery.jonaddams.com",
  // The number registered to the A2P 10DLC campaign. A carrier reviewer reads
  // this page and compares it against the registration, so the two must not
  // drift — publishing a number other than the registered one is a documented
  // cause of rejection, and was one of the mismatches on the first submission.
  messagingNumber: "+1 269 292-5337",
  effectiveDate: "August 26, 2026",
} as const;

// US carriers require this disclosure, close to verbatim, before approving an
// A2P 10DLC campaign. Paraphrasing it is a documented cause of rejection.
export const CARRIER_NO_SHARING_CLAUSE =
  "Mobile information will not be shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties.";

export const RATES_DISCLOSURE = "Message and data rates may apply.";
export const FREQUENCY_DISCLOSURE = "Message frequency varies.";

// The sample messages filed with the A2P 10DLC campaign, verbatim.
//
// These live here, as data, because the previous version of the /sms page
// restated them as hand-typed JSX prose — and that is exactly how they drifted.
// Twice. The second submission was rejected on its Call-to-Action check partly
// because the page's mention example said "mentioned you in a comment on",
// dropped the "Reply to add a comment." sentence, dropped the document link, and
// rendered its quotes as &ldquo;/&rdquo; curly quotes, while the filing and the
// application both said something else. Rendering strings instead of prose makes
// that class of mistake impossible: React escapes a straight quote as a straight
// quote.
//
// The other half of the match is manual and cannot be automated across repos:
// these must stay byte-identical to the constants in `lib/sms-program.ts` of the
// `dws-crud` repository, which is what the application actually sends. That file
// says the same thing in the other direction. Change one, change both, and
// re-file the campaign's samples in the same breath.
export const SAMPLE_MESSAGES = [
  {
    label: "When a colleague mentions you",
    text: `${LEGAL.appName}: Alice Example mentioned you on "Q3 Contract". Reply to add a comment. https://${LEGAL.appDomain}/documents/abc123 Reply STOP to opt out.`,
  },
  {
    label: "Confirming your registration",
    text: `${LEGAL.appName}: You're registered. Get a text when someone mentions you. Msg frequency varies. Msg&data rates may apply. Reply HELP for help, STOP to cancel.`,
  },
  {
    label: "If you reply HELP",
    text: `${LEGAL.appName}: Mention notifications for your documents. Reply to a notification to comment. Msg & data rates may apply. Reply STOP to opt out.`,
  },
  {
    label: "If you text a code that is already used",
    text: `${LEGAL.appName}: Your number is already registered. Reply HELP for help, STOP to cancel.`,
  },
] as const;
