/**
 * The document set for this sample.
 *
 * `referencePhrase` is the distinctive string that, when found in ANOTHER
 * document, becomes a link to this one. It must be distinctive: an exhibit
 * referring back to "the Agreement" would match nearly every clause in the
 * contract, so exhibits reference the full "Master Services Agreement" title
 * instead.
 *
 * This array is also the allow-list. A URI pulled off an annotation is only
 * ever matched against these filenames — it is never fetched directly.
 */
export type LinkedDocument = {
  /** Stable id used in component state and history. */
  id: string;
  /** Filename inside DOCUMENT_DIR. */
  fileName: string;
  /** Full title shown in the sidebar. */
  title: string;
  /** Short label shown in the breadcrumb. */
  shortLabel: string;
  /** Distinctive phrase that links TO this document from other documents. */
  referencePhrase: string;
};

export const DOCUMENT_DIR = "/documents/linked-exhibits";

export const DOCUMENTS: readonly LinkedDocument[] = [
  {
    id: "agreement",
    fileName: "master-services-agreement.pdf",
    title: "Master Services Agreement",
    shortLabel: "Agreement",
    referencePhrase: "Master Services Agreement",
  },
  {
    id: "exhibit-a",
    fileName: "exhibit-a-statement-of-work.pdf",
    title: "Exhibit A — Statement of Work",
    shortLabel: "Exhibit A",
    referencePhrase: "Exhibit A",
  },
  {
    id: "exhibit-b",
    fileName: "exhibit-b-fee-schedule.pdf",
    title: "Exhibit B — Fee Schedule",
    shortLabel: "Exhibit B",
    referencePhrase: "Exhibit B",
  },
  {
    id: "exhibit-c",
    fileName: "exhibit-c-mutual-nda.pdf",
    title: "Exhibit C — Mutual Non-Disclosure Agreement",
    shortLabel: "Exhibit C",
    referencePhrase: "Exhibit C",
  },
];

export const INITIAL_DOCUMENT_ID = "agreement";

export function documentUrl(doc: LinkedDocument): string {
  return `${DOCUMENT_DIR}/${doc.fileName}`;
}

export function findDocument(
  id: string,
  docs: readonly LinkedDocument[] = DOCUMENTS,
): LinkedDocument | undefined {
  return docs.find((doc) => doc.id === id);
}
