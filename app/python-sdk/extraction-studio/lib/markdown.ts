import { API_BASE } from "./api";

/**
 * Markdown export — /api/extraction/markdown.
 *
 * `provider` is a QUERY parameter here. /describe takes it as a Form field and
 * /tables takes it as a Query param; one endpoint's pattern does not imply
 * another's. Sending it as a form field is silent — the backend just defaults
 * to claude.
 *
 * ALL PAGES, not page 1. extract_markdown passes no max_pages, so Vision runs
 * once per page, SEQUENTIALLY (NAPY-7 makes concurrent Vision calls in one
 * process unsafe) and FAIL-FAST. Multi-page output is joined with
 * "\n\n---\n\n", so a `---` in the markdown may be a page boundary rather than
 * a horizontal rule the document contained.
 *
 * This is the VLM path (VisionOutputFormat.MARKDOWN), NOT export_as_markdown().
 * SDK-046's word loss does not apply and must not be mentioned in UI copy.
 */

export type MarkdownResult = {
  engine: string;
  filename: string;
  /** Echoed in the ENDPOINT's vocabulary ("claude"), not the studio's
   *  ("anthropic"). DescribeResults renders the same echo the same way. */
  provider: string;
  markdown: string;
  charCount: number;
  totalPages: number;
  processedPages: number;
  /** Built by the backend. Optional deliberately: this type is a claim about
   *  the backend, not a check on it, so the frontend can deploy first. Absent
   *  until _build_markdown_code ships. */
  code?: string;
  /** Also absent today — extract_markdown sets neither code nor timingMs,
   *  unlike the other four features. */
  timingMs?: number;
};

export type MarkdownRequest = {
  /** Public URL of the document, fetched here and posted as multipart because
   *  the backend holds no registry. */
  docPath: string;
  filename: string;
  /** "claude" | "openai" — this endpoint's vocabulary. The caller maps
   *  "anthropic" to "claude" before getting here. */
  provider: string;
};

export async function extractMarkdown(
  req: MarkdownRequest,
): Promise<MarkdownResult> {
  const fileResp = await fetch(req.docPath);
  if (!fileResp.ok) {
    throw new Error(`could not load ${req.docPath}: ${fileResp.status}`);
  }
  const blob = await fileResp.blob();

  const form = new FormData();
  form.append("file", new File([blob], req.filename));

  // No content-type header — the browser must set the multipart boundary.
  const resp = await fetch(
    `${API_BASE}/api/extraction/markdown?provider=${encodeURIComponent(
      req.provider,
    )}`,
    { method: "POST", body: form },
  );
  if (!resp.ok) {
    // FastAPI reports failures as {"detail": "..."}. A 503 means a provider is
    // unreachable; a 500 from a mid-document page carries a "page N:" prefix
    // that is the only way to tell a bad page from a bad document.
    const detail = await resp
      .json()
      .then((b) => (typeof b?.detail === "string" ? b.detail : null))
      .catch(() => null);
    throw new Error(detail ?? `markdown extraction failed: ${resp.status}`);
  }
  return (await resp.json()) as MarkdownResult;
}
