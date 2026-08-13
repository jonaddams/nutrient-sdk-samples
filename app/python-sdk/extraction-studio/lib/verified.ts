/**
 * Human-verified values for the sample corpus, read off the documents.
 *
 * Why this exists: an open-weight model is cheaper and less accurate than a
 * frontier one, and which trade a customer accepts is theirs to make. The
 * studio can only present that choice honestly if it can say what the right
 * answer was. Verified 2026-08-12; confirmed by Jon before shipping.
 *
 * `source` is the line each value was read from. It is not decoration — it is
 * the evidence behind the word "verified", and it saves the next session
 * re-deriving the value. Do NOT populate this file from a model's output: the
 * whole feature exists to catch models being wrong.
 *
 * Every value below was read directly off the document — the HTML twin under
 * public/invoices/ or public/documents/ where one exists, a direct visual
 * render of the PDF page, or the PDF's own text layer. None were derived from
 * a model's extraction or from raw OCR text taken at face value: two fields
 * that looked fine in OCR (bill-of-lading's totalWeightKg, and several of
 * westbridge's fields) turned out garbled on the actual page, which is the
 * exact failure mode this file exists to avoid reproducing.
 *
 * Two fields were deliberately left out of the key rather than guessed — see
 * the comments at scanned-invoice and emergency-dept-billing-worksheet below.
 * Both still extract and display in the UI; they are just not graded.
 *
 * Keyed by docId, the stable identifier in lib/docs.ts. Labels and paths have
 * both changed before; docIds have not.
 */
export type VerifiedValue = {
  value: string | number;
  source: string;
};

export const VERIFIED: Record<string, Record<string, VerifiedValue>> = {
  // --- invoices ---------------------------------------------------------
  "invoice-ac20251047": {
    invoiceNumber: {
      value: "AC-2025-1047",
      source: "Invoice No: AC-2025-1047",
    },
    issueDate: {
      value: "March 1, 2025",
      source: "Date: March 1, 2025",
    },
    totalAmount: {
      value: 345015,
      source: "Amount Due $345,015.00",
    },
  },
  "lumen-invoice": {
    invoiceNumber: {
      value: "616770524",
      source: "Invoice Number 616770524",
    },
    issueDate: {
      // NOT "Payment Due December 16, 2022", which is also printed and which
      // two of the three providers return. Confirmed by Jon 2026-08-12.
      value: "November 16, 2022",
      source: "Invoice Date November 16, 2022",
    },
    totalAmount: {
      value: 88.06,
      source: "Total Amount Due USD 88.06",
    },
  },
  "scanned-invoice": {
    // invoiceNumber is deliberately NOT verified: the document prints "No
    // 00162" as one unbroken string, both as the page heading and as the
    // "Invoice number" table value, with no colon separating a label from a
    // value. "00162" and "No 00162" are both defensible reads, so grading
    // either way would mark a provider wrong for a formatting judgement
    // rather than an actual extraction error. Jon's ruling, 2026-08-12.
    issueDate: {
      value: "20/09/2022",
      source: "Billing date 20/09/2022",
    },
    totalAmount: {
      value: 1165.1,
      source: "TOTAL 1,165.10€",
    },
  },
  "happy-tooth-invoice-excel": {
    invoiceNumber: {
      value: "5465",
      source: "Invoice #5465",
    },
    issueDate: {
      value: "4/1/2026",
      source: "4/1/2026",
    },
    totalAmount: {
      value: 4201.45,
      source: "TOTAL $4,201.45",
    },
  },

  // --- finance ------------------------------------------------------------
  // totalRevenue/totalAssets/totalLiabilities are optional in the preset
  // precisely because each statement only carries some of them (see the
  // comment in categories.ts). A field with no verified entry here means it
  // is genuinely absent from that document, not an oversight.
  "meridian-income-statement": {
    periodEnding: {
      value: "December 31, 2025",
      source: "Period Ending December 31, 2025",
    },
    totalRevenue: {
      value: 4820000,
      source: "Total revenue 4,820,000",
    },
    netIncome: {
      value: 612000,
      source: "Net income 612,000",
    },
    // totalAssets, totalLiabilities: absent from this document.
  },
  "meridian-balance-sheet": {
    periodEnding: {
      value: "December 31, 2025",
      source: "Period Ending December 31, 2025",
    },
    // totalRevenue: absent from this document.
    netIncome: {
      // Stated in prose, not a line item — see the categories.ts comment on
      // why extracting this is correct rather than a leak from the other
      // statement.
      value: 612000,
      source:
        "Net income of 612,000 for the period ties to the accompanying income statement",
    },
    totalAssets: {
      value: 4500000,
      source: "Total assets 4,500,000",
    },
    totalLiabilities: {
      value: 2200000,
      source: "Total liabilities 2,200,000",
    },
  },

  // --- construction ---------------------------------------------------------
  // construction-pay-application.pdf, generated by
  // scripts/generate-construction-payapp.py (G702-style certificate only, no
  // continuation sheet — see that script's module docstring for why). Values
  // read directly off the rendered page (2026-08-12), not off the generator's
  // PROJECT dict/compute() output — confirmed identical to what all three
  // providers actually returned across a 9-call hosted-backend measurement.
  "construction-pay-application": {
    projectName: {
      value: "Cedar Hollow Family Health Center - New Outpatient Building",
      source:
        "PROJECT Cedar Hollow Family Health Center - New Outpatient Building",
    },
    projectNumber: {
      value: "24-118",
      source: "PROJECT NO. 24-118",
    },
    applicationNumber: {
      value: "14",
      source: "APPLICATION NO. 14",
    },
    contractSumToDate: {
      value: 5036400,
      source: "CONTRACT SUM TO DATE (Line 1 +/- 2) $5,036,400.00",
    },
    retainage: {
      value: 197455,
      source: "Total Retainage $197,455.00",
    },
    currentPaymentDue: {
      value: 456665,
      source: "CURRENT PAYMENT DUE $456,665.00",
    },
  },

  // --- logistics ------------------------------------------------------------
  "bill-of-lading": {
    billOfLadingNumber: {
      value: "BL-2026-9910A",
      source: "BOL NUMBER: BL-2026-9910A",
    },
    shipper: {
      value: "Apex Industrial Supply Ltd.",
      source: "SHIPPER (FROM): Apex Industrial Supply Ltd.",
    },
    consignee: {
      value: "EuroHub Logistics Center",
      source: "CONSIGNEE (TO): EuroHub Logistics Center",
    },
    carrier: {
      value: "Inter-Continental Freight Carriers Inc.",
      source: "CARRIER: Inter-Continental Freight Carriers Inc.",
    },
    trailerNumber: {
      value: "TR-8841-EU",
      source: "TRAILER NO: TR-8841-EU",
    },
    totalWeightKg: {
      // OCR misread the pallet row's weight (1,145.20) as 1,145,290, which
      // would have made the printed grand total not add up. Read directly
      // off the rendered page instead: 1,145.20 + 420.00 = 1,565.20, matching
      // the printed total exactly.
      value: 1565.2,
      source: "17  TOTAL  1,565.20",
    },
  },

  // --- healthcare -----------------------------------------------------------
  "emergency-dept-billing-worksheet": {
    patientName: {
      value: "John Doe",
      source: "PATIENT NAME: JOHN DOE",
    },
    // recordId is deliberately NOT verified: as of 2026-08-13 the document
    // has been re-redacted with Nutrient's own redaction API (POST
    // /api/redaction/apply, backed by nutrient_sdk annotations.add_redact +
    // PdfSavePreferences.APPLY_REDACTIONS), so "#9920-A" is genuinely gone
    // from the text layer, not just covered by a cosmetic black bar. That
    // means there is no correct answer to grade against anymore -- the
    // field simply isn't in the document. Kept excluded for that reason,
    // not because visual and text layers disagree (they no longer do).
    admissionDate: {
      value: "12/04/2016",
      source: "Date of Admission: 12/04/2016",
    },
    facilitySubTotal: {
      // One line item ($5,400.00, Emergency Lumbar Stabilization Operating
      // Panel) is struck through and voided, replaced by $1,850.00 ("Replaced
      // by Code 72148"). $350.00 + $2,100.00 + $1,850.00 = $4,300.00, matching
      // the printed sub-total exactly.
      value: 4300,
      source: "FACILITY SUB-TOTAL EVALUATION: [RECONCILED] $4,300.00",
    },
    outOfPocketMaximum: {
      value: 1250,
      source:
        "The absolute net out-of-pocket maximum financial exposure for the primary named insured party during this isolated episode of acute emergency care is capped at exactly $1,250.00",
    },
  },

  // --- claims -----------------------------------------------------------
  "northgate-auto-claim-fnol": {
    claimNumber: {
      value: "CLM-2026-004417",
      source: "Claim Number CLM-2026-004417",
    },
    policyNumber: {
      value: "MAP-7781204-03",
      source: "Policy Number MAP-7781204-03",
    },
    insuredName: {
      value: "Daniel R. Whitfield",
      source: "Insured Name Daniel R. Whitfield",
    },
    dateOfLoss: {
      value: "March 14, 2026",
      source: "Date of Loss March 14, 2026",
    },
    estimatedDamage: {
      value: 8450,
      source: "Total estimated damage 8,450.00",
    },
  },

  // --- handwriting ------------------------------------------------------
  "apricot-cake-recipe": {
    documentTitle: {
      value: "Apricot Cake.",
      source: "Apricot Cake.",
    },
  },
  "dear-magnus-thank-you-note": {
    documentTitle: {
      // The pre-printed stationery's own header, not a title anyone wrote for
      // this note — see the categories.ts comment on why this is the weakest
      // of the four documentTitle values but still the correct read.
      value: "NOTES",
      source: "NOTES",
    },
  },
  "heavenly-hamburgers-recipe": {
    documentTitle: {
      value: "Heavenly Hamburgers",
      source: "Heavenly Here's what's cookin': Hamburgers",
    },
  },
  "employment-application": {
    documentTitle: {
      value: "Employment Application",
      source: "Employment Application",
    },
  },
};

/** The verified value for one field of one document, or null when unknown. */
export function verifiedFor(
  docId: string,
  fieldName: string,
): VerifiedValue | null {
  return VERIFIED[docId]?.[fieldName] ?? null;
}
