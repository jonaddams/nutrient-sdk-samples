import { z } from "zod";

/**
 * Tool definitions shared by the server route (which hands them to the model)
 * and the browser (which validates and executes every call against the live
 * content editor). Same split as Document Authoring AI: the server never runs
 * a tool, the browser owns the document.
 */

const elementId = z
  .string()
  .min(1)
  .describe(
    "Paragraph id exactly as returned by list_elements or search_elements.",
  );

const textStyle = z
  .object({
    family: z.string().optional().describe("Font family, e.g. 'Helvetica'."),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
    size: z.number().min(4).max(96).optional().describe("Font size in points."),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional()
      .describe("Hex color, e.g. '#1d4ed8'."),
  })
  .strict();

/**
 * Names mirror the Document Authoring AI example
 * (awesome-nutrient/document-authoring/ai-editing) wherever the operation
 * exists in both SDKs, so the two demos can be compared tool for tool.
 * set_paragraph_layout is Web SDK-only; tables and images are DocAuth-only.
 */
export const toolSchemas = {
  list_elements: z.object({
    pageIndex: z.number().int().min(0).describe("0-based page index."),
  }),
  search_elements: z.object({
    query: z.string().min(1).describe("Case-insensitive text to look for."),
  }),
  replace_paragraph: z
    .object({
      id: elementId,
      edit: z
        .object({
          find: z
            .string()
            .min(1)
            .describe(
              "Exact, case-sensitive substring of the paragraph's current text.",
            ),
          replace: z
            .string()
            .describe("Replacement text. Empty string deletes the match."),
          occurrence: z
            .number()
            .int()
            .min(1)
            .optional()
            .describe(
              "Which match to replace when `find` appears more than once (1-based). Default 1.",
            ),
        })
        .strict()
        .optional()
        .describe(
          "Targeted edit. The rest of the paragraph keeps its formatting. Preferred.",
        ),
      text: z
        .string()
        .min(1)
        .optional()
        .describe(
          "Full replacement text. Formatting collapses to the first run; use only for rewrites.",
        ),
    })
    .strict()
    .refine((v) => (v.edit ? 1 : 0) + (v.text ? 1 : 0) === 1, {
      message: "replace_paragraph requires exactly one of edit or text.",
    }),
  set_paragraph_text_style: z
    .object({
      ids: z.array(elementId).min(1),
      find: z
        .string()
        .min(1)
        .optional()
        .describe(
          "Style only this substring in each paragraph. Omit to style whole paragraphs.",
        ),
      style: textStyle,
    })
    .strict(),
  set_paragraph_layout: z
    .object({
      id: elementId,
      alignment: z.enum(["begin", "end", "center", "justified"]).optional(),
      maxWidth: z
        .number()
        .positive()
        .optional()
        .describe("Wrap width in PDF points."),
      lineSpacingFactor: z.number().min(0.5).max(3).optional(),
    })
    .strict(),
  add_paragraph: z
    .object({
      pageIndex: z.number().int().min(0),
      x: z
        .number()
        .min(0)
        .describe("Left edge in PDF points from the page's left."),
      y: z
        .number()
        .min(0)
        .describe("Top edge in PDF points from the page's top."),
      text: z.string().min(1),
      style: textStyle.optional(),
    })
    .strict(),
  delete_element: z.object({ id: elementId }).strict(),
} as const;

export type ToolName = keyof typeof toolSchemas;

const descriptions: Record<ToolName, string> = {
  list_elements:
    "List every paragraph (text block) on a page: id, text, bounding box, style, and layout. Also returns the page size and page count. Read before you write.",
  search_elements:
    "Search all pages for text. Returns the paragraphs that contain it, with ids. Use this to locate content before editing.",
  replace_paragraph:
    "Change a paragraph's text: either a targeted find/replace edit (keeps surrounding formatting) or a full rewrite.",
  set_paragraph_text_style:
    "Change font family, weight, italics, strikethrough, size, or color for one or more paragraphs, or for a substring within them.",
  set_paragraph_layout:
    "Change a paragraph's alignment, wrap width (maxWidth), or line spacing.",
  add_paragraph: "Add a new paragraph at a position on a page.",
  delete_element: "Delete a paragraph entirely.",
};

export const WRITE_TOOLS: ReadonlySet<ToolName> = new Set([
  "replace_paragraph",
  "set_paragraph_text_style",
  "set_paragraph_layout",
  "add_paragraph",
  "delete_element",
]);

/** Tool set for `streamText`: schemas only, no `execute`, so the browser runs them. */
export const modelTools = Object.fromEntries(
  (Object.keys(toolSchemas) as ToolName[]).map((name) => [
    name,
    { description: descriptions[name], inputSchema: toolSchemas[name] },
  ]),
) as {
  [K in ToolName]: {
    description: string;
    inputSchema: (typeof toolSchemas)[K];
  };
};

export const SYSTEM_PROMPT = `You edit a PDF through Nutrient Web SDK's content editor. The document is open in the user's browser; your tools run there.

How the document is modelled:
- Each page holds independent paragraphs (text blocks). Coordinates are PDF points, origin at the page's top-left.
- Paragraph ids are only valid until the user saves. Read (list_elements / search_elements) at the start of every request before writing.

The one rule that matters: PDFs do not reflow.
- Text grows inside its own block and wraps at maxWidth, but blocks below do NOT move. A longer paragraph can overlap the next one.
- Every write returns "warnings". If a warning reports an overlap or overflow, fix it before you finish: tighten the wording, reduce the font size slightly, or widen maxWidth if there is room. Never leave an overlap without telling the user.
- Prefer edits of similar length to the original.
- A paragraph's maxWidth usually hugs its current text, so even a few extra characters wrap onto a new line. Before lengthening a short paragraph (a name, a heading, a label), widen its maxWidth with set_paragraph_layout using the page width and the paragraphs around it to judge the room.
- Alignment only shows when maxWidth is wider than the text; widen it first if you centre or right-align.
- Bold or italic in a family the PDF does not embed falls back to another font. Mention it if you restyle.

Editing guidance:
- Use replace_paragraph with an edit for targeted changes so the rest of the paragraph keeps its formatting. Change only what the user asked for.
- Characters outside the document's embedded fonts can be lost on save; prefer plain characters already used in the document.
- You cannot save. Your edits are staged in the editor; the user reviews them and clicks Save or Discard. Never say the document has been saved.

When you finish, give a short summary of what you changed, page by page, and mention any limitation you hit.`;

// ---- Pure helpers (unit-tested) -------------------------------------------

export type Box = { left: number; top: number; width: number; height: number };

/** Character range of the n-th (1-based) occurrence of `find` in `text`. */
export function findRange(
  text: string,
  find: string,
  occurrence = 1,
): { begin: number; end: number } | null {
  let from = 0;
  for (let n = 1; ; n++) {
    const begin = text.indexOf(find, from);
    if (begin === -1) return null;
    if (n === occurrence) return { begin, end: begin + find.length };
    from = begin + find.length;
  }
}

// Text-block boxes on the same line commonly touch; ignore sub-point contact.
const OVERLAP_EPSILON = 1;

export function boxesOverlap(a: Box, b: Box): boolean {
  return (
    Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left) >
      OVERLAP_EPSILON &&
    Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top) >
      OVERLAP_EPSILON
  );
}

/**
 * Warnings a write should report: blocks the edited block overlaps now but
 * did not overlap before (pre-existing overlaps are the PDF's, not the
 * agent's), and spilling past the page edge.
 */
export function layoutWarnings(
  before: Box | null,
  after: Box,
  others: ReadonlyArray<{ id: string; text: string; boundingBox: Box }>,
  page: { width: number; height: number },
): string[] {
  const warnings: string[] = [];
  for (const other of others) {
    if (!boxesOverlap(after, other.boundingBox)) continue;
    if (before && boxesOverlap(before, other.boundingBox)) continue;
    warnings.push(
      `Now overlaps block ${other.id} ("${other.text.trim().slice(0, 40)}"). Text below does not reflow.`,
    );
  }
  if (
    after.top + after.height > page.height ||
    after.left + after.width > page.width
  ) {
    warnings.push("Block now extends past the page edge.");
  }
  return warnings;
}
