import { API_BASE } from "./api";

/**
 * Image description — /api/extraction/describe.
 *
 * PAGE 1 ONLY. describe_image wraps _prepared_input (the max_pages=1 variant)
 * because Vision.describe() reads one page image. The panel says so; do not
 * describe this as a whole-document summary anywhere in the UI.
 *
 * Output is PROSE — no elements, no coordinates, no citations. This is the
 * studio's first live feature that draws nothing on the document.
 *
 * NOTE the request shape differs from /tables: this endpoint takes `prompt`,
 * `provider` and `level` as multipart FORM fields, where /tables takes
 * `provider` as a QUERY parameter. One endpoint's pattern does not imply
 * another's.
 */

export type DescribeLevel = "standard" | "detailed";

export type DescribeResult = {
  engine: string;
  filename: string;
  provider: string;
  level: string;
  /** The prompt that ran, or the literal "(default)" when none was sent. */
  promptUsed: string;
  /** The description. One block of prose, meant to be read. */
  text: string;
  /** Built by the backend. Optional deliberately: this type is a claim about
   *  the backend, not a check on it, so the frontend can deploy first. */
  code?: string;
  timingMs?: number;
};

/** Three framings of the same SDK call. The point of the feature: one
 *  Vision.describe() does alt text, transcription or summarisation depending
 *  only on the prompt.
 *
 *  `describe` is FIRST and carries an EMPTY prompt, so the default demo
 *  exercises the SDK's own prompt rather than one we wrote. The backend echoes
 *  that back as promptUsed: "(default)". */
export const PROMPT_PRESETS: {
  id: string;
  label: string;
  prompt: string;
}[] = [
  { id: "describe", label: "Describe", prompt: "" },
  {
    id: "transcribe",
    label: "Transcribe",
    prompt:
      "Transcribe all handwritten and printed text on this page verbatim, preserving line breaks.",
  },
  {
    id: "summarise",
    label: "Summarise",
    prompt:
      "Summarise this page in three sentences for someone who cannot see it.",
  },
];

export type DescribeRequest = {
  /** Public URL of the document, e.g. "/documents/lumen-invoice.pdf". Fetched
   *  here and posted as multipart, because the backend holds no registry. */
  docPath: string;
  filename: string;
  /** "claude" | "openai" — this endpoint's vocabulary, NOT the studio's. The
   *  caller maps "anthropic" to "claude" before getting here. */
  provider: string;
  level: DescribeLevel;
  /** Empty means "send no prompt", which makes the SDK use its own. */
  prompt: string;
};

export async function extractDescription(
  req: DescribeRequest,
): Promise<DescribeResult> {
  const fileResp = await fetch(req.docPath);
  if (!fileResp.ok) {
    throw new Error(`could not load ${req.docPath}: ${fileResp.status}`);
  }
  const blob = await fileResp.blob();

  const form = new FormData();
  form.append("file", new File([blob], req.filename));
  form.append("provider", req.provider);
  form.append("level", req.level);
  // Appended only when non-empty: sending an empty prompt would override the
  // SDK's own default with nothing, and promptUsed would stop reading
  // "(default)".
  const trimmed = req.prompt.trim();
  if (trimmed) form.append("prompt", trimmed);

  // No content-type header — the browser must set the multipart boundary.
  const resp = await fetch(`${API_BASE}/api/extraction/describe`, {
    method: "POST",
    body: form,
  });
  if (!resp.ok) {
    // FastAPI reports failures as {"detail": "..."}. A 503 here means a
    // provider is unreachable, which is only diagnosable from that message.
    const detail = await resp
      .json()
      .then((b) => (typeof b?.detail === "string" ? b.detail : null))
      .catch(() => null);
    throw new Error(detail ?? `description failed: ${resp.status}`);
  }
  return (await resp.json()) as DescribeResult;
}
