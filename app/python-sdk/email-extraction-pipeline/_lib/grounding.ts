import type { FieldCitation } from "./types";

/**
 * Turn the SDK's raw extraction payload into per-field citations the viewer can
 * draw.
 *
 * Four conversions, all of them measured rather than assumed (2026-09-17):
 *
 * 1. `metadata` MIRRORS THE SHAPE OF `extraction`. It is not a flat map keyed by
 *    top-level field name. An object's metadata is an object of per-key
 *    metadata; an array's is a list. Grounding lives only at the leaves, so
 *    reading `metadata[field].bbox` for a nested field returns undefined — which
 *    looks exactly like "ungrounded" and is not. This is why the walk recurses.
 *
 * 2. `bbox.unit` REPORTS "pt" AND IS WRONG. The values are in the same space as
 *    `pages[].width/height` (e.g. 1650x2350, not 612x792). The service's own
 *    geometry.py says the field is unreliable and ignores it; that is correct.
 *    Normalising against the page dims also makes the overlay resolution-free.
 *
 * 3. `page` IS 1-INDEXED; the Nutrient viewer is 0-indexed. Converted once,
 *    here, so nothing downstream has to remember.
 *
 * 4. `source_bboxes` IS THE PRECISE ONE. `bbox` is a single merged, rounded box;
 *    `source_bboxes` gives one box per text block. Measured over 144 grounded
 *    fields: 131 had one box, 12 had two. So ~8% of values span blocks and get
 *    drawn too large if you use `bbox` alone.
 */

interface RawBox {
  x: number;
  y: number;
  width: number;
  height: number;
  unit?: string;
}

interface RawLeaf {
  page?: number;
  bbox?: RawBox;
  source_bboxes?: { block_id?: string; page?: number; bbox?: RawBox }[];
  match?: string | null;
  confidenceComponents?: {
    groundingScore?: number | null;
    formatScore?: number | null;
    source?: string | null;
  };
}

export interface RawExtractionPayload {
  extraction?: Record<string, unknown>;
  metadata?: unknown;
  pages?: { page: number; width: number; height: number }[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function isLeaf(node: unknown): node is RawLeaf {
  return (
    typeof node === "object" &&
    node !== null &&
    ("bbox" in node || "source_bboxes" in node)
  );
}

function normaliseBoxes(
  leaf: RawLeaf,
  pageDims: Map<number, { width: number; height: number }>,
): FieldCitation | null {
  // Prefer the per-block boxes; fall back to the merged one.
  const sources =
    leaf.source_bboxes && leaf.source_bboxes.length > 0
      ? leaf.source_bboxes.map((s) => ({
          page: s.page ?? leaf.page,
          bbox: s.bbox,
        }))
      : [{ page: leaf.page, bbox: leaf.bbox }];

  const boxes: FieldCitation["boxes"] = [];
  let page1: number | undefined;

  for (const s of sources) {
    if (!s.bbox || typeof s.page !== "number") continue;
    const dims = pageDims.get(s.page);
    if (!dims || dims.width <= 0 || dims.height <= 0) continue;
    page1 ??= s.page;
    boxes.push({
      x0: clamp01(s.bbox.x / dims.width),
      y0: clamp01(s.bbox.y / dims.height),
      x1: clamp01((s.bbox.x + s.bbox.width) / dims.width),
      y1: clamp01((s.bbox.y + s.bbox.height) / dims.height),
    });
  }

  if (boxes.length === 0 || page1 === undefined) return null;

  // Two fields read from the same text block ground to an identical rectangle
  // (measured: total.amount and total.currency both came from "Amount Due
  // $345,015.00"). Drawing both stacks translucent fills and darkens one value
  // for no reason, so collapse exact duplicates.
  const unique = boxes.filter(
    (b, i) =>
      boxes.findIndex(
        (o) => o.x0 === b.x0 && o.y0 === b.y0 && o.x1 === b.x1 && o.y1 === b.y1,
      ) === i,
  );

  return {
    page: page1 - 1, // viewer is 0-indexed
    boxes: unique,
    groundingScore: leaf.confidenceComponents?.groundingScore ?? null,
    match: leaf.match ?? null,
  };
}

/**
 * Flatten the metadata tree into `path -> citation`, using dotted paths and
 * `[i]` for array elements: `vendor_name`, `total.amount`, `line_items[0].amount`.
 */
export function walkCitations(
  payload: RawExtractionPayload,
): Record<string, FieldCitation> {
  const pageDims = new Map(
    (payload.pages ?? []).map((p) => [
      p.page,
      { width: p.width, height: p.height },
    ]),
  );
  const out: Record<string, FieldCitation> = {};

  const visit = (node: unknown, path: string) => {
    if (isLeaf(node)) {
      const citation = normaliseBoxes(node, pageDims);
      if (citation) out[path] = citation;
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child, i) => {
        visit(child, `${path}[${i}]`);
      });
      return;
    }
    if (typeof node === "object" && node !== null) {
      for (const [key, child] of Object.entries(node)) {
        visit(child, path ? `${path}.${key}` : key);
      }
    }
  };

  visit(payload.metadata, "");
  return out;
}

/**
 * Which populated fields came back without a location.
 *
 * Measured at 0 of 144 across four providers, so this should stay quiet — but it
 * is the signal that a value came from somewhere the citation machinery could
 * not see, and silence is the point rather than the problem.
 */
/**
 * Fields that cannot be grounded by definition, because no text on the page
 * corresponds to them.
 *
 * `minor_unit_exponent` is the one that matters: "USD has 2 decimal places" is
 * knowledge about the currency, not a value printed on the invoice, so there is
 * nothing for a bounding box to point at. Measured — it was the single
 * ungrounded field in an otherwise perfect extraction, and flagging it sent a
 * correct row to human review. A rule that fires on the happy path gets ignored,
 * which is worse than not having it.
 */
const DERIVED_FIELDS = new Set(["minor_unit_exponent"]);

export function ungroundedPaths(
  extraction: Record<string, unknown>,
  citations: Record<string, FieldCitation>,
): string[] {
  const missing: string[] = [];
  const visit = (node: unknown, path: string) => {
    if (node === null || node === undefined) return;
    if (Array.isArray(node)) {
      node.forEach((child, i) => {
        visit(child, `${path}[${i}]`);
      });
      return;
    }
    if (typeof node === "object") {
      for (const [k, v] of Object.entries(node)) {
        visit(v, path ? `${path}.${k}` : k);
      }
      return;
    }
    if (!path) return;
    // Compare on the leaf name so nested paths are covered too.
    const leaf = path.split(".").pop() ?? path;
    if (DERIVED_FIELDS.has(leaf)) return;
    if (!citations[path]) missing.push(path);
  };
  visit(extraction, "");
  return missing;
}
