/**
 * The document set for this sample, and the cross-references between them.
 *
 * DOCUMENTS is also the allow-list. A URI pulled off an annotation is only
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
  /** Page count, so the UI can show "page 2 of 3" without querying the SDK. */
  pageCount: number;
};

/**
 * One phrase that becomes a link wherever it appears in another document.
 *
 * `page` is **1-based**, matching the `#page=` open parameter documented at
 * https://www.nutrient.io/guides/web/features/open-parameters/ — the sample
 * puts it on the link URI as a fragment and lets the SDK's own
 * `viewStateFromOpenParameters()` turn it into a 0-based currentPageIndex.
 *
 * Deep links are per-PHRASE, not per-document: "Exhibit B" opens the fee
 * schedule at page 1, while "Section B.1" opens the same document at the rate
 * card on page 2.
 *
 * Two invariants, both enforced by tests in link-navigation.test.ts:
 *
 * 1. No phrase may be a substring of another. Otherwise searching the shorter
 *    one would also match inside the longer one and stack two overlapping
 *    links on the same words.
 * 2. Every `page` must be within its target document's `pageCount`.
 *
 * Section placement is pinned by explicit page breaks in
 * scripts/generate-linked-exhibits.py. If you move a section in the generator,
 * update the page numbers here to match.
 */
export type CrossReference = {
  /** Phrase searched for in every OTHER document. */
  phrase: string;
  /** Document id this phrase links to. */
  targetId: string;
  /** 1-based page to open, per the #page= open parameter. */
  page: number;
  /** What sits on that page — shown in the sidebar so the demo is legible. */
  targetDescription: string;
};

export const DOCUMENT_DIR = "/documents/linked-exhibits";

export const DOCUMENTS: readonly LinkedDocument[] = [
  {
    id: "agreement",
    fileName: "master-services-agreement.pdf",
    title: "Master Services Agreement",
    shortLabel: "Agreement",
    pageCount: 3,
  },
  {
    id: "exhibit-a",
    fileName: "exhibit-a-statement-of-work.pdf",
    title: "Exhibit A — Statement of Work",
    shortLabel: "Exhibit A",
    pageCount: 3,
  },
  {
    id: "exhibit-b",
    fileName: "exhibit-b-fee-schedule.pdf",
    title: "Exhibit B — Fee Schedule",
    shortLabel: "Exhibit B",
    pageCount: 3,
  },
  {
    id: "exhibit-c",
    fileName: "exhibit-c-mutual-nda.pdf",
    title: "Exhibit C — Mutual Non-Disclosure Agreement",
    shortLabel: "Exhibit C",
    pageCount: 2,
  },
];

export const CROSS_REFERENCES: readonly CrossReference[] = [
  {
    phrase: "Master Services Agreement",
    targetId: "agreement",
    page: 1,
    targetDescription: "first page",
  },
  {
    phrase: "Exhibit A",
    targetId: "exhibit-a",
    page: 1,
    targetDescription: "first page",
  },
  {
    phrase: "Section A.2",
    targetId: "exhibit-a",
    page: 2,
    targetDescription: "deliverables schedule, page 2",
  },
  {
    phrase: "Section A.5",
    targetId: "exhibit-a",
    page: 3,
    targetDescription: "acceptance procedure, page 3",
  },
  {
    phrase: "Exhibit B",
    targetId: "exhibit-b",
    page: 1,
    targetDescription: "first page",
  },
  {
    phrase: "Section B.1",
    targetId: "exhibit-b",
    page: 2,
    targetDescription: "rate card, page 2",
  },
  {
    phrase: "Exhibit C",
    targetId: "exhibit-c",
    page: 1,
    targetDescription: "first page",
  },
  {
    phrase: "Section C.4",
    targetId: "exhibit-c",
    page: 2,
    targetDescription: "survival term, page 2",
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
