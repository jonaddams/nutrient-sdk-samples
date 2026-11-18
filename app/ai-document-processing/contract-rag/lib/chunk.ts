/**
 * The two chunkers. FAIRNESS RULE: they share one size budget, and the rest of
 * the pipeline (embedding model, top-k, prompt, model) is identical. The only
 * variable is what ingestion hands the chunker: flat page text vs. the DWS
 * parse's typed elements with bounds.
 */

export const CHUNK_BUDGET = 1000;

/** A rectangle as fractions (0-1) of its page, origin top-left. */
export type Box = { page: number; x: number; y: number; w: number; h: number };

export type Chunk = {
  id: string;
  doc: string;
  page: number; // 0-based
  text: string;
  boxes?: Box[];
  /** Table chunks only: each row's cell texts and its bounding box. */
  rows?: { cells: string[]; box: Box }[];
};

/** Plain-text pipeline: fixed windows over each page's extracted text. */
export function naiveChunks(doc: string, pages: string[]): Chunk[] {
  const out: Chunk[] = [];
  pages.forEach((text, page) => {
    for (let s = 0; s < text.length; s += CHUNK_BUDGET) {
      const t = text.slice(s, s + CHUNK_BUDGET).trim();
      if (t.length > 20)
        out.push({ id: `${doc}#n${out.length}`, doc, page, text: t });
    }
  });
  return out;
}

/** The subset of a DWS `/extraction/parse` spatial element this code reads. */
export type ParseElement = {
  type: string;
  role?: string | null;
  text?: string | null;
  readingOrder: number;
  bounds: { x: number; y: number; width: number; height: number };
  // Bounds are in THIS page's units, which vary per page and per mode: PDF
  // points on born-digital pages in `structure` mode, 200-dpi raster px on
  // OCR'd pages and in `understand` mode. Always scale by this element's own
  // page size.
  page: { pageIndex: number; width: number; height: number };
  cells?:
    | {
        row: number;
        column: number;
        text?: string | null;
        bounds?: ParseElement["bounds"];
      }[]
    | null;
};

const SKIP_ROLES = new Set(["Footer", "PageFooter", "Header", "PageHeader"]);
const HEADING_ROLES = new Set(["SectionHeader", "Title"]);

const toBox = (e: ParseElement): Box => ({
  page: e.page.pageIndex,
  x: e.bounds.x / e.page.width,
  y: e.bounds.y / e.page.height,
  w: e.bounds.width / e.page.width,
  h: e.bounds.height / e.page.height,
});

function tableRows(e: ParseElement): NonNullable<Chunk["rows"]> {
  const rows = new Map<
    number,
    { cells: string[]; x0: number; y0: number; x1: number; y1: number }
  >();
  for (const c of e.cells ?? []) {
    if (!c.bounds) continue;
    const r = rows.get(c.row) ?? {
      cells: [],
      x0: Infinity,
      y0: Infinity,
      x1: -Infinity,
      y1: -Infinity,
    };
    r.cells.push((c.text ?? "").trim());
    r.x0 = Math.min(r.x0, c.bounds.x);
    r.y0 = Math.min(r.y0, c.bounds.y);
    r.x1 = Math.max(r.x1, c.bounds.x + c.bounds.width);
    r.y1 = Math.max(r.y1, c.bounds.y + c.bounds.height);
    rows.set(c.row, r);
  }
  const { width: pw, height: ph, pageIndex: page } = e.page;
  return [...rows.values()].map((r) => ({
    cells: r.cells.filter(Boolean),
    box: {
      page,
      x: r.x0 / pw,
      y: r.y0 / ph,
      w: (r.x1 - r.x0) / pw,
      h: (r.y1 - r.y0) / ph,
    },
  }));
}

/**
 * Narrow a table citation to the row(s) the answer actually quotes: rows where
 * at least two cells of 3+ characters appear verbatim in the cited text. Below
 * that bar a match is noise ("100" inside "1000"), so the caller falls back to
 * the whole table.
 * ponytail: verbatim substring match; misses answers that reformat values
 * (e.g. "May 3, 2017" for "3-May-17").
 */
export function matchRows(
  rows: NonNullable<Chunk["rows"]>,
  text: string,
): Box[] {
  const scored = rows.map((r) => ({
    box: r.box,
    n: r.cells.filter((c) => c.length >= 3 && text.includes(c)).length,
  }));
  const best = Math.max(0, ...scored.map((s) => s.n));
  return best >= 2 ? scored.filter((s) => s.n === best).map((s) => s.box) : [];
}

function tableMarkdown(e: ParseElement): string {
  const rows = new Map<number, Map<number, string>>();
  for (const c of e.cells ?? []) {
    if (!rows.has(c.row)) rows.set(c.row, new Map());
    rows.get(c.row)?.set(c.column, (c.text ?? "").replace(/\s+/g, " "));
  }
  return [...rows.entries()]
    .sort(([a], [b]) => a - b)
    .map(
      ([, cols]) =>
        `| ${[...cols.entries()]
          .sort(([a], [b]) => a - b)
          .map(([, v]) => v)
          .join(" | ")} |`,
    )
    .join("\n");
}

/**
 * Nutrient pipeline. Generic rules, none written for a particular question:
 * 1. pack WHOLE paragraphs up to the shared budget (never cut mid-clause);
 * 2. drop page headers/footers (on scans, reading order puts the footer
 *    directly before each table, so it would become the table's "caption");
 * 3. prefix each chunk with its nearest section header;
 * 4. keep every table whole, as Markdown, captioned with the two paragraphs
 *    physically ABOVE it on the page (bounds, not reading order).
 */
export function parsedChunks(doc: string, elements: ParseElement[]): Chunk[] {
  const els = elements
    .filter((e) => !SKIP_ROLES.has(e.role ?? ""))
    .sort(
      (a, b) =>
        a.page.pageIndex - b.page.pageIndex || a.readingOrder - b.readingOrder,
    );
  const out: Chunk[] = [];
  let cur: Chunk | null = null;
  let section = "";
  const flush = () => {
    if (cur?.text.trim()) out.push(cur);
    cur = null;
  };

  for (const e of els) {
    const text = (e.text ?? "").trim();
    if (e.role && HEADING_ROLES.has(e.role)) {
      flush();
      section = text;
    }
    if (e.type === "table") {
      flush();
      const top = e.bounds.y;
      const caption = els
        .filter(
          (p) =>
            p.type !== "table" &&
            p.page.pageIndex === e.page.pageIndex &&
            p.text &&
            p.bounds.y + p.bounds.height <= top + 5,
        )
        .sort(
          (a, b) =>
            b.bounds.y + b.bounds.height - (a.bounds.y + a.bounds.height),
        )
        .slice(0, 2)
        .reverse()
        .map((p) => (p.text ?? "").trim());
      out.push({
        id: `${doc}#t${out.length}`,
        doc,
        page: e.page.pageIndex,
        text: [section, ...caption, tableMarkdown(e)]
          .filter(Boolean)
          .join("\n"),
        boxes: [toBox(e)],
        rows: tableRows(e),
      });
      continue;
    }
    if (!text) continue;
    if (
      cur &&
      (cur.text.length + text.length > CHUNK_BUDGET ||
        cur.page !== e.page.pageIndex)
    )
      flush();
    if (!cur) {
      cur = {
        id: `${doc}#p${out.length}`,
        doc,
        page: e.page.pageIndex,
        text: section && section !== text ? section : "",
        boxes: [],
      };
    }
    cur.text += (cur.text ? "\n" : "") + text;
    cur.boxes?.push(toBox(e));
  }
  flush();
  return out;
}

/** Cosine top-k over L2-normalized vectors (dot product). */
export function topK<T extends { v: number[] }>(
  q: number[],
  items: T[],
  k: number,
) {
  return items
    .map((item) => ({
      item,
      score: item.v.reduce((s, x, i) => s + x * q[i], 0),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
