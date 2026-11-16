"use client";

// Click-to-scroll outline.
//
//   1. Walk the document with the Programmatic API (transaction()) and pick
//      out heading-like paragraphs (bold + larger font size). The SDK has no
//      named "Heading 1/2" concept on Paragraph, so formatting is the signal.
//   2. On click, find the heading with editor.find.search() and scroll to it
//      with editor.navigateTo() (Document Authoring >= 1.22).
//
// A heading's text can also appear earlier in body copy ("see Pricing"), so
// each entry records which search match is the heading itself.

export type HeadingLevel = 1 | 2;

export interface HeadingEntry {
  text: string;
  level: HeadingLevel;
  /** Index into editor.find.search(text) results that is this heading. */
  matchIndex: number;
}

interface MinimalFormatting {
  bold: boolean | null;
  fontSize: number | null;
}

interface MinimalInline {
  type: string;
  formatting?: () => MinimalFormatting;
}

interface MinimalTextView {
  getPlainText: () => string;
  inlines: () => { inline: MinimalInline }[];
}

interface MinimalBlockLevel {
  type: "paragraph" | "table" | string;
  asTextView?: () => MinimalTextView;
}

interface MinimalDraftDocument {
  // Since 1.15 the body is one flat container; Section.content() is gone.
  body: () => { content: () => { blocklevels: () => MinimalBlockLevel[] } };
}

export interface MinimalDocument {
  transaction: <T>(
    cb: (ctx: { draft: MinimalDraftDocument }) => Promise<{
      commit: boolean;
      result: T;
    }>,
  ) => Promise<T>;
}

const HEADING_MIN_FONT = 14;
const H1_MIN_FONT = 20;

/** Non-overlapping, case-insensitive occurrences of `needle` in `haystack`. */
export function countOccurrences(haystack: string, needle: string): number {
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (!n) return 0;
  let count = 0;
  for (let i = h.indexOf(n); i !== -1; i = h.indexOf(n, i + n.length)) count++;
  return count;
}

export async function extractOutline(
  doc: MinimalDocument,
): Promise<HeadingEntry[]> {
  return doc.transaction(async ({ draft }) => {
    const headings: HeadingEntry[] = [];
    let precedingText = "";

    for (const bl of draft.body().content().blocklevels()) {
      if (bl.type !== "paragraph" || !bl.asTextView) continue;
      const tv = bl.asTextView();
      const text = tv.getPlainText();
      const trimmed = text.trim();

      if (trimmed) {
        const fmt = tv
          .inlines()
          .find((ri) => ri.inline.type === "text" && !!ri.inline.formatting)
          ?.inline.formatting?.();
        if (
          fmt?.bold === true &&
          typeof fmt.fontSize === "number" &&
          fmt.fontSize >= HEADING_MIN_FONT
        ) {
          headings.push({
            text: trimmed,
            level: fmt.fontSize >= H1_MIN_FONT ? 1 : 2,
            matchIndex: countOccurrences(precedingText, trimmed),
          });
        }
      }
      // Newline keeps matches from spanning paragraph boundaries.
      precedingText += `${text}\n`;
    }

    return { commit: false, result: headings };
  });
}
