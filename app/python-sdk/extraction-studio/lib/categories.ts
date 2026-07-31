import { newSchemaProp, type SchemaProp } from "./schema";

export type CategoryId =
  | "invoices"
  | "finance"
  | "construction"
  | "logistics"
  | "healthcare"
  | "claims";

export const CATEGORY_ORDER: CategoryId[] = [
  "invoices",
  "finance",
  "construction",
  "logistics",
  "healthcare",
  "claims",
];

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  invoices: "Invoices",
  finance: "Finance",
  construction: "Construction",
  logistics: "Logistics",
  healthcare: "Healthcare",
  claims: "Claims",
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
  // Spans both statement types deliberately: the income statement fills revenue
  // and net income, the balance sheet fills assets and liabilities, and each
  // returns null for the other pair. That is honest rather than broken, and it
  // demonstrates optional-field handling. periodEnding is the one field both
  // documents carry, so it stays required.
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
};

export function labelFor(category: string): string {
  return CATEGORY_LABELS[category as CategoryId] ?? category;
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
