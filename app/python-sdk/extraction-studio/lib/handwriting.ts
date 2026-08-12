import { API_BASE } from "./api";
import type { IndexedCitation } from "./citations";
import { type OcrColorMode, type OcrElement, ocrCitationsFor } from "./ocr";

/**
 * Handwriting recognition — one feature over two backend endpoints.
 *
 * `local` calls /api/extraction/icr and runs entirely on the backend machine:
 * no provider, no API key, no outbound request. `vlm` calls
 * /api/extraction/vlm, which runs the same recognition and hands the page to a
 * vision model, which reads cursive the local engine cannot.
 *
 * Both return the SAME shape as /ocr's JSON branch, because all three go
 * through the backend's _format_extraction_result — which is why the element
 * type here is OcrElement and the overlay needs no new drawing code.
 */

export type HandwritingEngine = "local" | "vlm";

export type HandwritingResult = {
  /** "ICR" or "VLM", from the backend. Not the studio's own engine id. */
  engine: string;
  filename: string;
  statistics: {
    totalElements: number;
    textElements: number;
    averageConfidence: number;
    lowConfidenceElements: number;
  };
  fullText: string;
  textElements: OcrElement[];
  pages: { page: number; width: number; height: number }[];
  /** Optional deliberately, matching OcrResult: this type is a claim about the
   *  backend's shape, not a check on it, and the frontend can deploy first. */
  code?: string;
  config: { engine: string; provider?: string };
  timingMs: number;
};

export type HandwritingRequest = {
  docPath: string;
  filename: string;
  engine: HandwritingEngine;
  /** Wire name ("openai" | "claude"). Carried even for `local`, which ignores
   *  it — the config panel keeps its provider selection across an engine
   *  switch, so the request object always has one. */
  provider: string;
};

/** Whether a result came from the VLM engine.
 *
 *  Reads the RESULT, never the config panel's current toggle: flipping the
 *  toggle without re-running must not change how the panel describes the run
 *  already on screen. */
export function isVlmRun(result: HandwritingResult): boolean {
  return result.engine === "VLM";
}

/** Overlay boxes for one handwriting run.
 *
 *  Delegates to ocrCitationsFor — the element shape is identical, including the
 *  hex-omission trick that lets custom mode fall through to the studio-wide
 *  picker. The one thing added here: a VLM run is FORCED to custom, because its
 *  per-element confidences are carried over unchanged from the local
 *  recognition pass and describe text the model has since rewritten. Colouring
 *  by them would paint a correct transcription red. */
export function handwritingCitationsFor(
  result: HandwritingResult | null,
  mode: OcrColorMode,
): IndexedCitation[] {
  if (!result) return [];
  return ocrCitationsFor(
    result.textElements ?? [],
    isVlmRun(result) ? "custom" : mode,
  );
}

export async function extractHandwriting(
  req: HandwritingRequest,
): Promise<HandwritingResult> {
  const fileResp = await fetch(req.docPath);
  if (!fileResp.ok) {
    throw new Error(`could not load ${req.docPath}: ${fileResp.status}`);
  }
  const blob = await fileResp.blob();

  const form = new FormData();
  form.append("file", new File([blob], req.filename));

  // /vlm declares `provider` as a Query parameter, NOT a Form field — unlike
  // /describe, which takes it as Form. Putting it in the body silently falls
  // back to the SDK default (a local VLM at localhost:1234) and 503s on any
  // machine without LM Studio running.
  const url =
    req.engine === "vlm"
      ? `${API_BASE}/api/extraction/vlm?provider=${encodeURIComponent(req.provider)}`
      : `${API_BASE}/api/extraction/icr`;

  const resp = await fetch(url, { method: "POST", body: form });
  if (!resp.ok) {
    const detail = await resp
      .json()
      .then((b) => (typeof b?.detail === "string" ? b.detail : null))
      .catch(() => null);
    throw new Error(detail ?? `Handwriting recognition failed: ${resp.status}`);
  }
  return (await resp.json()) as HandwritingResult;
}
