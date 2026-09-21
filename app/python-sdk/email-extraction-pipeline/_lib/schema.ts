/**
 * The extraction schema, and the rules that decide whether a human should look.
 *
 * Sent to the SDK wrapped as `{"schema": ...}` — a bare JSON Schema earns
 * InvalidArgumentException 3016. Every object needs `additionalProperties:false`
 * and a `required` array, nested objects and array `items` included, or Claude's
 * structured-output path rejects it with:
 *   "For 'object' type, 'additionalProperties' must be explicitly set to false"
 *
 * ## Why the money fields are flat
 *
 * The obvious shape — a reusable `Money {amount_minor, currency, exponent}` on
 * each of subtotal/tax/shipping/discount/total — is REJECTED:
 *
 *   "The compiled grammar is too large, which would cause performance issues.
 *    Simplify your tool schemas or reduce the number of strict tools."
 *
 * Five nested objects, each carrying an 11-member currency enum and nullable
 * unions throughout, is more than the structured-output grammar compiler will
 * take. Hoisting currency to the top solves it and is better modelling anyway:
 * an invoice has ONE currency, and repeating it five times invites five answers
 * to a question with one.
 *
 * It also improves grounding. A flat `total_minor` grounds directly as a scalar
 * leaf, where `total.amount` needed the recursive walk to be found at all.
 */

export const INVOICE_SCHEMA = {
  schema: {
    type: "object",
    properties: {
      vendor_name: { type: ["string", "null"] },
      invoice_number: { type: ["string", "null"] },

      // One currency for the document. Nullable, never defaulted — defaulting to
      // USD turns a EUR1,000 invoice into a $1,000 invoice silently.
      currency: {
        enum: ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SEK", null],
      },
      // JPY has 0 minor units, KWD has 3. Without it a JPY total displays 100x wrong.
      minor_unit_exponent: { type: ["integer", "null"] },

      // Integer minor units throughout. 1234.56 is not representable in binary
      // floating point, and the provider sweep returned 4201.455700683594 for a
      // $4,201.45 invoice — exactly the drift this avoids.
      //
      // The arithmetic set: line items sum to SUBTOTAL, not total. A rule
      // comparing them against `total` fires on every invoice that has tax.
      subtotal_minor: { type: ["integer", "null"] },
      tax_total_minor: { type: ["integer", "null"] },
      shipping_minor: { type: ["integer", "null"] },
      discount_minor: { type: ["integer", "null"] },
      total_minor: { type: ["integer", "null"] },

      due_date: { type: ["string", "null"], format: "date" },

      line_items: {
        type: ["array", "null"],
        items: {
          type: "object",
          properties: {
            description: { type: "string" },
            amount_minor: { type: "integer" },
          },
          required: ["description", "amount_minor"],
          additionalProperties: false,
        },
      },
    },
    required: [
      "vendor_name",
      "invoice_number",
      "currency",
      "minor_unit_exponent",
      "subtotal_minor",
      "tax_total_minor",
      "shipping_minor",
      "discount_minor",
      "total_minor",
      "due_date",
      "line_items",
    ],
    additionalProperties: false,
  },
};

export const EXTRACTION_INSTRUCTIONS = [
  "Extract invoice fields from this document.",
  "If a value is not clearly present, return null rather than guessing.",
  "All amounts are integer minor units: $345,015.00 is 34501500.",
  "Where an invoice prints both an invoice date and a payment-due date,",
  "the invoice date is the issue date.",
].join(" ");

type Extraction = Record<string, unknown>;

const int = (v: unknown): number | null => (typeof v === "number" ? v : null);

/**
 * Review flags mean a human should look. Context flags describe the input and
 * must never route to review on their own — a clean body-only invoice is not a
 * defect, and flagging it teaches reviewers to ignore the queue.
 */
export function assess(
  extraction: Extraction,
  ungrounded: string[],
): { reviewFlags: string[]; contextFlags: string[] } {
  const review: string[] = [];
  const context: string[] = [];

  const total = int(extraction.total_minor);
  if (!extraction.vendor_name || total === null)
    review.push("missing_required");
  if (total !== null && !extraction.currency) review.push("currency_unknown");

  const due = extraction.due_date;
  if (typeof due === "string" && due && Number.isNaN(Date.parse(due))) {
    review.push("date_unparseable");
  }

  // The arithmetic checks. The provider sweep made these load-bearing: both
  // open-weight models returned a confidently wrong total WITH a 0.95 grounding
  // score, so grounding cannot catch that class of error and these can.
  const TOLERANCE = 1; // one minor unit
  const subtotal = int(extraction.subtotal_minor);
  const items = Array.isArray(extraction.line_items)
    ? extraction.line_items
    : null;

  if (items && items.length > 0 && subtotal !== null) {
    const summed = items.reduce<number>(
      (acc, li) =>
        acc + (int((li as { amount_minor?: unknown })?.amount_minor) ?? 0),
      0,
    );
    if (Math.abs(summed - subtotal) > TOLERANCE)
      review.push("subtotal_mismatch");
  }

  if (subtotal !== null && total !== null) {
    const tax = int(extraction.tax_total_minor) ?? 0;
    const shipping = int(extraction.shipping_minor) ?? 0;
    const discount = int(extraction.discount_minor) ?? 0;
    if (Math.abs(subtotal + tax + shipping - discount - total) > TOLERANCE) {
      review.push("total_mismatch");
    }
  }

  if (ungrounded.length > 0) review.push("ungrounded_field");

  // `low_grounding` is deliberately absent. Every groundingScore observed across
  // 144 fields and four providers was exactly 0.95, so a threshold below that
  // never fires and one at it always does. Calibrating against a constant is not
  // calibration — add the rule when a fixture actually produces a low score.

  return { reviewFlags: review, contextFlags: context };
}
