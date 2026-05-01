"use client";

// Click-to-scroll plumbing.
//
// The Document Authoring SDK 1.12.0 paints document text outside the
// queryable DOM and exposes no `revealRange`/`scrollToBlock`/`setSelection`
// API on DocAuthEditor. These helpers approximate scroll-to-heading by:
//
//   1. Walking the document via the Programmatic API (transaction()) to
//      extract heading-like paragraphs (bold + larger fontSize) along with
//      a cumulative character offset that approximates each heading's
//      vertical position.
//   2. Reaching into the editor's shadow root to find the real overflow
//      container, then setting scrollTop proportionally.
//
// This is intentionally a heuristic. Headings are detected by formatting,
// not by a named-style concept (the SDK has none on Paragraph). Vertical
// position is weighted by character count, which is a better-than-uniform
// approximation but ignores rendered line wrapping, images, and tables.

export type HeadingLevel = 1 | 2;

export interface HeadingEntry {
  text: string;
  level: HeadingLevel;
  /** Cumulative character offset / total characters. In [0, 1). */
  fraction: number;
}

interface MinimalFormatting {
  bold: boolean | null;
  fontSize: number | null;
}

interface MinimalInline {
  type: string;
  formatting?: () => MinimalFormatting;
}

interface MinimalRangeInline {
  inline: MinimalInline;
}

interface MinimalTextView {
  getPlainText: () => string;
  inlines: () => MinimalRangeInline[];
}

interface MinimalBlockLevel {
  type: "paragraph" | "table" | string;
  asTextView?: () => MinimalTextView;
}

interface MinimalSectionContent {
  blocklevels: () => MinimalBlockLevel[];
}

interface MinimalSection {
  content: () => MinimalSectionContent;
}

interface MinimalBody {
  sections: () => MinimalSection[];
}

interface MinimalDraftDocument {
  body: () => MinimalBody;
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
// Each block contributes at least this many characters of "weight" so
// blank lines and empty separators don't disappear in the cumulative sum.
const MIN_BLOCK_WEIGHT = 24;
// Tables don't expose a TextView; treat them as a fixed weight similar to
// a short paragraph. Refine later if accuracy matters.
const TABLE_WEIGHT = 200;

export async function extractOutline(
  doc: MinimalDocument,
): Promise<HeadingEntry[]> {
  return doc.transaction(async ({ draft }) => {
    interface BlockSummary {
      text: string;
      weight: number;
      heading?: { level: HeadingLevel; text: string };
    }

    const blocks: BlockSummary[] = [];

    for (const section of draft.body().sections()) {
      for (const bl of section.content().blocklevels()) {
        if (bl.type === "paragraph" && bl.asTextView) {
          const tv = bl.asTextView();
          const text = tv.getPlainText();
          const trimmed = text.trim();

          let heading: BlockSummary["heading"];
          if (trimmed.length > 0) {
            const firstText = tv
              .inlines()
              .find((ri) => ri.inline.type === "text" && !!ri.inline.formatting);
            const fmt = firstText?.inline.formatting?.();
            if (
              fmt?.bold === true &&
              typeof fmt.fontSize === "number" &&
              fmt.fontSize >= HEADING_MIN_FONT
            ) {
              heading = {
                level: fmt.fontSize >= H1_MIN_FONT ? 1 : 2,
                text: trimmed,
              };
            }
          }

          blocks.push({
            text: trimmed,
            weight: Math.max(text.length, MIN_BLOCK_WEIGHT),
            heading,
          });
        } else {
          blocks.push({ text: "", weight: TABLE_WEIGHT });
        }
      }
    }

    const total = blocks.reduce((a, b) => a + b.weight, 0) || 1;
    const headings: HeadingEntry[] = [];
    let cum = 0;
    for (const b of blocks) {
      if (b.heading) {
        headings.push({
          text: b.heading.text,
          level: b.heading.level,
          fraction: cum / total,
        });
      }
      cum += b.weight;
    }

    return { commit: false, result: headings };
  });
}

/**
 * Walks the editor host's children to find the descendant that hosts the
 * SDK's shadow root. The SDK creates the shadow on a child of the element
 * passed to createEditor().
 */
function findShadowHost(container: HTMLElement): HTMLElement | null {
  if (container.shadowRoot) return container;
  for (const el of container.querySelectorAll<HTMLElement>("*")) {
    if (el.shadowRoot) return el;
  }
  return null;
}

/**
 * Inside the SDK's shadow root, find the first scroll container that has
 * actual overflow. This is where document pages are scrolled.
 */
function findShadowScroller(shadowHost: HTMLElement): HTMLElement | null {
  const sr = shadowHost.shadowRoot;
  if (!sr) return null;
  for (const el of sr.querySelectorAll<HTMLElement>("*")) {
    const cs = getComputedStyle(el);
    if (
      (cs.overflowY === "auto" || cs.overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight + 5
    ) {
      return el;
    }
  }
  return null;
}

export function getEditorScroller(container: HTMLElement): HTMLElement | null {
  const host = findShadowHost(container);
  return host ? findShadowScroller(host) : null;
}

export function scrollToFraction(
  scroller: HTMLElement,
  fraction: number,
  smooth = true,
): void {
  const max = scroller.scrollHeight - scroller.clientHeight;
  if (max <= 0) return;
  const top = Math.max(0, Math.min(max, max * fraction));
  scroller.scrollTo({ top, behavior: smooth ? "smooth" : "auto" });
}
