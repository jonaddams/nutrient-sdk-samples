import { API_BASE } from "./api";

/**
 * Text export — /api/extraction/text.
 *
 * Takes NO parameters. `export_as_text(filepath)` has no options at all: no
 * page range, no max_pages, no format flags. Unlike /markdown and /tables this
 * does not go through _prepared_pages, so MAX_PRERENDER_PAGES does not apply
 * and the whole document is exported.
 *
 * It is the SDK's lossless path — SDK-046's own repro uses export_as_text() as
 * the baseline it measures export_as_markdown()'s word loss against. That
 * defect does not apply here.
 *
 * Output is a fixed-width spatial reconstruction: columns sit where they sit on
 * the page, so a two-column document reads out of order line by line.
 */

export type TextResult = {
  engine: string;
  filename: string;
  text: string;
  charCount: number;
  wordCount: number;
  totalPages: number;
  /** Computed server-side as `bool(text.strip())`. The single source of truth
   *  for the empty state — never re-derive it from `text` here. */
  hasTextLayer: boolean;
  /** Built by the backend. Optional deliberately: this type is a claim about
   *  the backend, not a check on it, so the frontend can deploy first. */
  code?: string;
  timingMs?: number;
};

export type TextRequest = {
  /** Public URL of the document, fetched here and posted as multipart because
   *  the backend holds no registry. */
  docPath: string;
  filename: string;
};

/**
 * Elapsed time, in the unit that keeps the number meaningful.
 *
 * Deliberately NOT shared with the sibling panels' inline
 * `(timingMs / 1000).toFixed(1)`. Their runs take seconds, so that formatter is
 * right for them; this feature's runs take single-digit milliseconds, where it
 * renders "0.0s" and destroys the one claim the panel exists to make.
 * Retrofitting the siblings is a separate change with no benefit to them.
 */
export function elapsedLabel(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export async function extractText(req: TextRequest): Promise<TextResult> {
  const fileResp = await fetch(req.docPath);
  if (!fileResp.ok) {
    throw new Error(`could not load ${req.docPath}: ${fileResp.status}`);
  }
  const blob = await fileResp.blob();

  const form = new FormData();
  form.append("file", new File([blob], req.filename));

  // No query string: the endpoint takes no options. No content-type header
  // either — the browser must set the multipart boundary.
  const resp = await fetch(`${API_BASE}/api/extraction/text`, {
    method: "POST",
    body: form,
  });
  if (!resp.ok) {
    // FastAPI reports failures as {"detail": "..."}.
    const detail = await resp
      .json()
      .then((b) => (typeof b?.detail === "string" ? b.detail : null))
      .catch(() => null);
    throw new Error(detail ?? `text export failed: ${resp.status}`);
  }
  return (await resp.json()) as TextResult;
}
