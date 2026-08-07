import { API_BASE } from "./api";
import type { Citation } from "./api";
import type { IndexedCitation } from "./citations";

/**
 * Adaptive OCR — runs entirely on the backend machine. No provider, no API key,
 * no network call, so unlike the LM Studio provider this works on the hosted
 * deployment too.
 */

/** Mirrors OCR_LANGUAGES in the backend's app/services/ocr_options.py, in the
 *  same order. Verified accepted by the SDK 2026-08-06. Adding a code here that
 *  the backend does not know earns a 400 on Run. */
export const OCR_LANGUAGES = [
  "eng", "deu", "fra", "spa", "ita", "por", "nld", "swe", "dan", "pol",
  "tur", "ell", "rus", "jpn", "kor", "chi_sim", "chi_tra", "ara", "heb", "hin",
] as const;

/** The ONLY separator the SDK accepts. A comma, semicolon, pipe or space makes
 *  it return an empty document silently rather than raising. */
const LANGUAGE_SEPARATOR = "+";

export type OcrWord = { text: string; confidence: number };

export type OcrElement = {
  readingOrder: number;
  type: string;
  role?: string;
  text: string;
  confidence: number;
  /** 0-based, matching the viewer. */
  page: number | null;
  /** Same fractional shape /structured returns, so the existing overlay draws it. */
  citation: Citation | null;
  words?: OcrWord[];
};

/** Which colour the OCR overlay paints its region boxes. */
export type OcrColorMode = "confidence" | "custom";

/** Bands a confidence score into the three tones `.match-dot` already styles.
 *
 *  A sibling of matchDotTone() in StructuredResults, NOT a reuse of it: that one
 *  keys on match strings ("exact", "not_found") while this takes a float.
 *  Conflating the two would mean one function with two unrelated input types. */
export function confidenceTone(n: number): "good" | "partial" | "bad" {
  if (n >= 0.85) return "good";
  if (n >= 0.5) return "partial";
  return "bad";
}

/** Fill colour for a region box, so the overlay shows WHERE OCR was unsure.
 *
 *  Values MUST match `.match-dot.good/.partial/.bad` in styles.css — that is
 *  the source of truth for these three tones. They used to diverge (this
 *  function had its own brighter #22c55e/#eab308/#ef4444), so the dot next to
 *  an element and the box drawn for that same element were visibly different
 *  greens. */
export function confidenceHex(n: number): string {
  const tone = confidenceTone(n);
  if (tone === "good") return "#4a9d6a";
  if (tone === "partial") return "#c9a227";
  return "#c8553c";
}

/** Build the document overlay's boxes for one OCR run.
 *
 *  `fieldIndex` is the index into the FULL element list, not into the array
 *  returned here: uncited elements are dropped, so the result is COMPACTED and
 *  its array position is not the row a click should select.
 *
 *  In `custom` mode each entry omits `hex` ENTIRELY rather than setting it to
 *  undefined, so resolveHex (`citation.hex ?? fallback`) falls through to the
 *  studio-wide picker value — the same path structured extraction takes. */
export function ocrCitationsFor(
  elements: OcrElement[],
  mode: OcrColorMode,
): IndexedCitation[] {
  return elements.flatMap((el, index) =>
    el.citation
      ? [
          {
            fieldIndex: index,
            citation: el.citation,
            ...(mode === "confidence"
              ? { hex: confidenceHex(el.confidence) }
              : {}),
          },
        ]
      : [],
  );
}

export type OcrResult = {
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
  /** Present only when outputFormat was "markdown". */
  markdown?: string;
  /** The 'how you'd do this yourself' snippet the backend builds for this run.
   *  Optional deliberately, matching StructuredResults: this type is a claim
   *  about the backend's shape, not a check on it, and the frontend can deploy
   *  before the backend does. */
  code?: string;
  config: { languages: string; outputFormat: string; tableDetection: boolean };
  timingMs: number;
};

export type OcrRequest = {
  docPath: string;
  filename: string;
  languages: string[];
  tableDetection: boolean;
  outputFormat: "json" | "markdown";
};

export async function extractOcr(req: OcrRequest): Promise<OcrResult> {
  const fileResp = await fetch(req.docPath);
  if (!fileResp.ok) {
    throw new Error(`could not load ${req.docPath}: ${fileResp.status}`);
  }
  const blob = await fileResp.blob();

  const form = new FormData();
  form.append("file", new File([blob], req.filename));
  // Falls back to the SDK's own default rather than sending an empty string,
  // which the backend allowlist rejects — an empty picker stays usable.
  form.append(
    "languages",
    req.languages.length ? req.languages.join(LANGUAGE_SEPARATOR) : "eng",
  );
  form.append("table_detection", String(req.tableDetection));
  form.append("output_format", req.outputFormat);

  const resp = await fetch(`${API_BASE}/api/extraction/ocr`, {
    method: "POST",
    body: form,
  });
  if (!resp.ok) {
    // The allowlist 400 names the offending code; surfacing it is the whole
    // point of validating server-side instead of returning a blank page.
    const detail = await resp
      .json()
      .then((b) => (typeof b?.detail === "string" ? b.detail : null))
      .catch(() => null);
    throw new Error(detail ?? `OCR failed: ${resp.status}`);
  }
  return (await resp.json()) as OcrResult;
}
