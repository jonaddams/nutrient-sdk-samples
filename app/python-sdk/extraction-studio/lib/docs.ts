export type DocSummary = {
  /** Stable identifier used as a React key and for selection state. */
  docId: string;
  label: string;
  /** Public URL, served from public/. Not necessarily derivable from docId —
   *  three of these files predate this sample and live where other samples
   *  already reference them. Do not "tidy" the paths. */
  path: string;
  /** Sent as the upload filename, so the backend's echo and generated code
   *  snippet name something recognisable. */
  filename: string;
  hasTextLayer: boolean;
};

/**
 * The document list is code, not a directory scan.
 *
 * The backend used to own a registry and serve PDFs over `/api/doc/{id}`; it is
 * now stateless, and Next serves these statically from public/. A hardcoded
 * manifest is the whole mechanism — there is no endpoint to call and nothing to
 * fall back to.
 *
 * `Invoice AC-2025-1047.pdf`, `scanned-invoice.pdf` and
 * `happy-tooth-invoice-excel.pdf` were already in this repo, byte-identical to
 * the demo's copies, and are referenced from their existing paths rather than
 * duplicated.
 *
 * Two documents from the original nine are deliberately absent: `construction`
 * and `accident-report` are byte-identical duplicates of
 * `westbridge-engineering-submittal-form` and
 * `emergency-dept-billing-worksheet` respectively (identical PNG renders; the
 * latter pair differs only in the PDF trailer /ID). Listing either would show
 * the same document twice under two names.
 */
export const DOCUMENTS: DocSummary[] = [
  {
    docId: "invoice-ac20251047",
    label: "Atlas Construction invoice",
    path: "/invoices/Invoice AC-2025-1047.pdf",
    filename: "invoice-ac20251047.pdf",
    hasTextLayer: true,
  },
  {
    docId: "lumen-invoice",
    label: "Lumen invoice",
    path: "/documents/lumen-invoice.pdf",
    filename: "lumen-invoice.pdf",
    hasTextLayer: false,
  },
  {
    docId: "scanned-invoice",
    label: "Scanned invoice",
    path: "/documents/scanned-invoice.pdf",
    filename: "scanned-invoice.pdf",
    hasTextLayer: false,
  },
  {
    docId: "happy-tooth-invoice-excel",
    label: "Happy Tooth invoice (from Excel)",
    path: "/documents/happy-tooth-invoice-excel.pdf",
    filename: "happy-tooth-invoice-excel.pdf",
    hasTextLayer: true,
  },
  {
    docId: "westbridge-engineering-submittal-form",
    label: "Westbridge submittal transmittal",
    path: "/documents/westbridge-engineering-submittal-form.pdf",
    filename: "westbridge-engineering-submittal-form.pdf",
    hasTextLayer: false,
  },
  {
    docId: "bill-of-lading",
    label: "Straight bill of lading",
    path: "/documents/bill-of-lading.pdf",
    filename: "bill-of-lading.pdf",
    hasTextLayer: false,
  },
  {
    docId: "emergency-dept-billing-worksheet",
    label: "ED billing worksheet",
    path: "/documents/emergency-dept-billing-worksheet.pdf",
    filename: "emergency-dept-billing-worksheet.pdf",
    hasTextLayer: true,
  },
];

export function findDoc(docId: string): DocSummary | undefined {
  return DOCUMENTS.find((d) => d.docId === docId);
}
