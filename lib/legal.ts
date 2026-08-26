// Shared facts for the site's legal and messaging-program pages. These values
// appear in an A2P 10DLC campaign registration, so the pages and the
// registration must agree; change them here rather than in the pages.

export const LEGAL = {
  brand: "Jon Addams",
  domain: "jonaddams.com",
  contactEmail: "support@jonaddams.com",
  appName: "Bindery",
  appDomain: "bindery.jonaddams.com",
  // Twilio trial number. Replace when the account is upgraded — the number in
  // the campaign registration and the number published here must match.
  messagingNumber: "+1 737 258 3742",
  effectiveDate: "August 26, 2026",
} as const;

// US carriers require this disclosure, close to verbatim, before approving an
// A2P 10DLC campaign. Paraphrasing it is a documented cause of rejection.
export const CARRIER_NO_SHARING_CLAUSE =
  "Mobile information will not be shared with third parties or affiliates for marketing or promotional purposes. Text messaging originator opt-in data and consent will not be shared with any third parties.";

export const RATES_DISCLOSURE = "Message and data rates may apply.";
export const FREQUENCY_DISCLOSURE = "Message frequency varies.";
