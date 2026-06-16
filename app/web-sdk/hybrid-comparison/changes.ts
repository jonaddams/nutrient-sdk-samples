export type ChangeType = "insert" | "delete";

export interface ChangeEntry {
  id: string;
  type: ChangeType;
  text: string;
  pageIndex: number;
  /** [left, top, width, height] in PDF page coordinates. */
  rect: [number, number, number, number];
}

interface RawOperation {
  type: string;
  text: string;
  originalTextBlocks?: { rect: number[] }[];
  changedTextBlocks?: { rect: number[] }[];
}

/**
 * Flattens a `compareDocuments` result into a typed list of changes for one page.
 * Pure: does not touch the SDK or create annotations.
 */
export function extractChanges(
  result: unknown,
  pageIndex: number,
): ChangeEntry[] {
  const out: ChangeEntry[] = [];
  const docResults =
    (result as { documentComparisonResults?: unknown[] })
      ?.documentComparisonResults ?? [];

  let seq = 0;
  for (const doc of docResults as { comparisonResults?: unknown[] }[]) {
    for (const cr of (doc.comparisonResults ?? []) as { hunks?: unknown[] }[]) {
      for (const hunk of (cr.hunks ?? []) as {
        operations?: RawOperation[];
      }[]) {
        for (const op of hunk.operations ?? []) {
          if (op.type !== "delete" && op.type !== "insert") continue;
          const block =
            op.type === "delete" ? op.originalTextBlocks : op.changedTextBlocks;
          const rect = block?.[0]?.rect;
          if (!rect || rect.length < 4) continue;
          out.push({
            id: `${pageIndex}:${op.type}:${seq++}:${rect[0]},${rect[1]}`,
            type: op.type,
            text: op.text,
            pageIndex,
            rect: [rect[0], rect[1], rect[2], rect[3]],
          });
        }
      }
    }
  }
  return out;
}
