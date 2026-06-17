// Pairs a text-comparison result into "replacement" changes (old → new) so each
// custom-overlay callout shows a meaningful before/after instead of single
// characters. Pure: no SDK calls.

export type ReplacementKind = "replace" | "insert" | "delete";

export interface ReplacementChange {
  id: string;
  kind: ReplacementKind;
  oldText: string; // "" for a pure insertion
  newText: string; // "" for a pure deletion
  pageIndex: number;
  /**
   * Anchor rect [left, top, width, height] in the *changed* document for
   * replacements/insertions; falls back to the original-document rect for a
   * pure deletion (which has no position in the changed document).
   */
  rect: [number, number, number, number];
}

interface RawOperation {
  type: string;
  text: string;
  originalTextBlocks?: { rect: number[] }[];
  changedTextBlocks?: { rect: number[] }[];
}

function rectOf(
  blocks?: { rect: number[] }[],
): [number, number, number, number] | null {
  const r = blocks?.[0]?.rect;
  if (!r || r.length < 4) return null;
  return [r[0], r[1], r[2], r[3]];
}

/**
 * Flattens a `compareDocuments` result into paired replacement changes for one
 * page. A delete immediately followed by an insert becomes one `replace`.
 */
export function extractReplacements(
  result: unknown,
  pageIndex: number,
): ReplacementChange[] {
  const out: ReplacementChange[] = [];
  const docResults =
    (result as { documentComparisonResults?: unknown[] })
      ?.documentComparisonResults ?? [];

  let seq = 0;
  for (const doc of docResults as { comparisonResults?: unknown[] }[]) {
    for (const cr of (doc.comparisonResults ?? []) as { hunks?: unknown[] }[]) {
      for (const hunk of (cr.hunks ?? []) as {
        operations?: RawOperation[];
      }[]) {
        const ops = (hunk.operations ?? []).filter(
          (o) => o.type === "insert" || o.type === "delete",
        );
        let i = 0;
        while (i < ops.length) {
          const cur = ops[i];
          const next = ops[i + 1];
          if (cur.type === "delete" && next?.type === "insert") {
            const rect = rectOf(next.changedTextBlocks);
            if (rect)
              out.push({
                id: `${pageIndex}:replace:${seq++}`,
                kind: "replace",
                oldText: cur.text,
                newText: next.text,
                pageIndex,
                rect,
              });
            i += 2;
            continue;
          }
          if (cur.type === "insert") {
            const rect = rectOf(cur.changedTextBlocks);
            if (rect)
              out.push({
                id: `${pageIndex}:insert:${seq++}`,
                kind: "insert",
                oldText: "",
                newText: cur.text,
                pageIndex,
                rect,
              });
            i += 1;
            continue;
          }
          // pure delete
          const rect = rectOf(cur.originalTextBlocks);
          if (rect)
            out.push({
              id: `${pageIndex}:delete:${seq++}`,
              kind: "delete",
              oldText: cur.text,
              newText: "",
              pageIndex,
              rect,
            });
          i += 1;
        }
      }
    }
  }
  return out;
}
