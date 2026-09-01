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
