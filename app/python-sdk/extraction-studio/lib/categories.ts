import { newSchemaProp, type SchemaProp } from "./schema";

export type CategoryId =
  | "invoices"
  | "finance"
  | "construction"
  | "logistics"
  | "healthcare"
  | "claims"
  | "handwriting";

export const CATEGORY_ORDER: CategoryId[] = [
  "invoices",
  "finance",
  "construction",
  "logistics",
  "healthcare",
  "claims",
  "handwriting",
];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  invoices: "Invoices",
  finance: "Finance",
  construction: "Construction",
  logistics: "Logistics",
  healthcare: "Healthcare",
  claims: "Claims",
  handwriting: "Handwriting",
};

/** A preset row before it is given an id. */
type PresetRow = Omit<SchemaProp, "id">;

/**
 * Why this file exists: the default schema used to be hardcoded to invoice
 * fields, so selecting a bill of lading and pressing Run extracted
 * `invoiceNumber` from a document that has none — empty or nonsense values on
 * most of the samples. The demo only looked correct because it opened on an
 * invoice.
 *
 * Field names are taken from the labels each category's documents ACTUALLY
 * print, read off the PDFs rather than guessed. Fields are optional wherever a
 * sample might genuinely lack them, so a null reads as "not present in this
 * document" rather than as a failed extraction.
 */
const PRESETS: Record<CategoryId, PresetRow[]> = {
  invoices: [
    {
      key: "invoiceNumber",
      type: "string",
      description: "The invoice number/reference",
      optional: false,
    },
    {
      key: "issueDate",
      type: "string",
      description: "The issue date, as printed",
      optional: false,
    },
    {
      key: "totalAmount",
      type: "number",
      description: "The final total due, digits only",
      optional: false,
    },
  ],
  // Spans both statement types deliberately, so some fields are null on any one
  // document. That is honest rather than broken, and it demonstrates
  // optional-field handling. periodEnding is the one field both documents carry,
  // so it stays required.
  //
  // Measured against gpt-5.4 (2026-07-31), not assumed:
  //   income statement -> periodEnding, totalRevenue, netIncome
  //                       (totalAssets/totalLiabilities null — absent from the doc)
  //   balance sheet    -> periodEnding, totalAssets, totalLiabilities, AND netIncome
  //                       (totalRevenue null)
  //
  // netIncome fills on BOTH. The balance sheet states it in prose — "Net income of
  // 612,000 for the period ties to the accompanying income statement" — so
  // extracting it is correct, not a leak. Only totalRevenue is exclusive to the
  // income statement.
  finance: [
    {
      key: "periodEnding",
      type: "string",
      description: "The reporting period end date, as printed",
      optional: false,
    },
    {
      key: "totalRevenue",
      type: "number",
      description: "Total revenue for the period, digits only",
      optional: true,
    },
    {
      key: "netIncome",
      type: "number",
      description: "Net income for the period, digits only",
      optional: true,
    },
    {
      key: "totalAssets",
      type: "number",
      description: "Total assets, digits only",
      optional: true,
    },
    {
      key: "totalLiabilities",
      type: "number",
      description: "Total liabilities, digits only",
      optional: true,
    },
  ],
  // Read off the Westbridge submittal transmittal. NOTE: no contractAmount or
  // percentComplete — that document is a submittal transmittal form and carries
  // no dollar figures at all, so both would always return null.
  construction: [
    {
      key: "projectName",
      type: "string",
      description: "The project name",
      optional: false,
    },
    {
      key: "projectNumber",
      type: "string",
      description: "The project number/reference",
      optional: false,
    },
    {
      key: "submittalNumber",
      type: "string",
      description: "The submittal number",
      optional: false,
    },
    {
      key: "specSection",
      type: "string",
      description: "The specification section and its title",
      optional: true,
    },
    {
      key: "submittedBy",
      type: "string",
      description: "The contractor or firm submitting",
      optional: true,
    },
    {
      key: "dateRequired",
      type: "string",
      description: "The date the response is required by, as printed",
      optional: true,
    },
  ],
  logistics: [
    {
      key: "billOfLadingNumber",
      type: "string",
      description: "The bill of lading number",
      optional: false,
    },
    {
      key: "shipper",
      type: "string",
      description: "The shipping party's company name",
      optional: false,
    },
    {
      key: "consignee",
      type: "string",
      description: "The receiving party's company name",
      optional: false,
    },
    {
      key: "carrier",
      type: "string",
      description: "The carrier's company name",
      optional: true,
    },
    {
      key: "trailerNumber",
      type: "string",
      description: "The trailer number",
      optional: true,
    },
    {
      key: "totalWeightKg",
      type: "number",
      description: "The total shipment weight in kilograms, digits only",
      optional: true,
    },
  ],
  // Renamed from the original guesses to the worksheet's own labels:
  // patientAccountNumber -> recordId, serviceDate -> admissionDate,
  // totalCharges -> facilitySubTotal.
  healthcare: [
    {
      key: "patientName",
      type: "string",
      description: "The patient's name, as printed",
      optional: false,
    },
    {
      key: "recordId",
      type: "string",
      description: "The patient record identifier",
      optional: false,
    },
    {
      key: "admissionDate",
      type: "string",
      description: "The date of admission, as printed",
      optional: false,
    },
    {
      key: "facilitySubTotal",
      type: "number",
      description: "The facility sub-total charge, digits only",
      optional: true,
    },
    {
      // Deliberately included: this one sits in a dense prose paragraph rather
      // than a table, so it demonstrates extraction from running text. Optional
      // because a model may reasonably miss it.
      key: "outOfPocketMaximum",
      type: "number",
      description:
        "The patient's maximum out-of-pocket exposure stated in the notice text, digits only",
      optional: true,
    },
  ],
  claims: [
    {
      key: "claimNumber",
      type: "string",
      description: "The claim number",
      optional: false,
    },
    {
      key: "policyNumber",
      type: "string",
      description: "The policy number",
      optional: false,
    },
    {
      key: "insuredName",
      type: "string",
      description: "The insured party's full name",
      optional: false,
    },
    {
      key: "dateOfLoss",
      type: "string",
      description: "The date of loss, as printed",
      optional: false,
    },
    {
      key: "estimatedDamage",
      type: "number",
      description: "The total estimated damage amount, digits only",
      optional: true,
    },
  ],
  // Unlike every other category, `handwriting` groups by MEDIUM (four images,
  // no PDF wrapper) rather than by document type — invoices are all invoices,
  // claims are all claims, but this category is a recipe, a thank-you note, a
  // recipe card and an employment application. Read all four images directly
  // (2026-08-11 review) before trusting anything here, because that mismatch
  // means most candidate fields turn out grounded on one document and blank or
  // wrong on the other three:
  //
  //   - A "written date" field was dropped. None of the four carry one. The
  //     recipe ("Apricot Cake."), the note ("Dear Magnus,") and the recipe
  //     card ("Heavenly Hamburgers") have no date anywhere. The application
  //     has dates, but only inside "Previous Employment History" (start/end
  //     dates of past jobs, e.g. "1/15/2009" / "6/30/2011") — extracting one
  //     of those as "the document's date" would be an arbitrary, wrong pick,
  //     not a grounded field.
  //   - A "primary name" field was dropped too. It resolves on exactly one
  //     document (the application's "Full Name: Jane Doe") and is either
  //     absent or ambiguous on the rest: the recipe names no one at all; the
  //     note is addressed "Dear Magnus," but signed by three people ("Kind
  //     Regards, Erik, Tronel & Sanita"); the card credits "Aunt Lola" as
  //     origin and then lists a four-person chain ("from Lola to Grandmommy
  //     to Mom to Ruth"). There is no single person to call "primary" on
  //     three of the four, and `SchemaProp.type` has no array/list option
  //     (StructuredConfig's type <select> only offers string/number/boolean,
  //     enforced by categories.test.ts) — a comma-joined names string would
  //     be contorting a list into a scalar field rather than an honest one,
  //     so this was dropped instead of forced in.
  //
  // `documentTitle` is the one field the set actually shares: "Apricot Cake."
  // heads the recipe, "Heavenly Hamburgers" heads the card, and "Employment
  // Application" heads the form — all three describe that document's actual
  // content. The note is weaker: it prints "NOTES" above "Dear Magnus,", but
  // "NOTES" is the pre-printed stationery's own header, not a title anyone
  // wrote for this note — the same word would appear at the top of any sheet
  // torn off that pad. It still extracts a non-empty value, which is why
  // `required` stays defensible, but say so plainly rather than imply all
  // four are titled equally: three are grounded on content, one only on
  // paper stock. Required, not optional, all the same — unlike the two
  // fields above, this one is genuinely on every document, so there's no
  // document to soften it for.
  handwriting: [
    {
      key: "documentTitle",
      type: "string",
      description: "The document's title or heading, as written or printed",
      optional: false,
    },
  ],
};

export function labelFor(category: string): string {
  return CATEGORY_LABELS[category as CategoryId] ?? category;
}

/**
 * One-click extraction guidance, offered beside the Instructions box.
 *
 * Deliberately NOT pre-filled. A pre-filled instruction silently fixes the
 * exact miss the verified column exists to reveal, so the presenter would never
 * see the trade-off the studio is there to present. Applied live, it shows both
 * halves: what a cheaper model costs, and that guidance closes part of the gap.
 *
 * The invoices string is load-bearing and MEASURED — nineteen runs against the
 * hosted backend, 2026-08-12. It names only retainage yet also corrects a
 * retainer-credit case, so the model is generalising from it; a more literally
 * accurate rewording is untested, and rewording the field description instead
 * was tried and did not work. Re-verify before changing a character.
 */
export const GUIDANCE_PRESETS: Partial<
  Record<CategoryId, { label: string; text: string }[]>
> = {
  invoices: [
    {
      label: "Amount due, not contract value",
      text: "For totalAmount use the final Amount Due payable now, after any retainage deduction — not the contract value.",
    },
  ],
};

export function guidanceFor(
  category: string,
): { label: string; text: string }[] {
  return GUIDANCE_PRESETS[category as CategoryId] ?? [];
}

/**
 * Fresh rows with generated ids — never a shared literal. Two categories
 * returning rows with identical ids would hand React duplicate keys, and
 * callers edit these rows in place.
 *
 * Callers MUST memoise the result per category: StructuredConfig's preset
 * effect keys on the array's identity, so calling this inline during render
 * would re-fire it every render.
 */
export function presetFor(category: string): SchemaProp[] {
  const rows = PRESETS[category as CategoryId];
  if (!rows) {
    console.warn(
      `no schema preset for category "${category}"; falling back to invoices`,
    );
    return PRESETS.invoices.map((row) => newSchemaProp(row));
  }
  return rows.map((row) => newSchemaProp(row));
}
