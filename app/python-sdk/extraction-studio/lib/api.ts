export type Citation = {
  page: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};

export type FieldResult = {
  name: string;
  type: string;
  value: unknown;
  page: number | null;
  confidence: number | null;
  match: string | null;
  citation: Citation | null;
};

export type StructuredData = {
  fields: FieldResult[];
  extraction: Record<string, unknown>;
};

export type Envelope = {
  feature: string;
  resultType: string;
  config: Record<string, unknown>;
  timingMs: number;
  /** The uploaded file's name. The backend is stateless — it knows only the
   *  bytes it was handed, so there is no document id to echo back. */
  filename: string;
  data: Record<string, unknown>;
  raw: string;
  code: string;
};

export type StructuredRequest = {
  /** Public URL of the PDF, e.g. "/documents/lumen-invoice.pdf". Fetched here
   *  and posted as multipart, because the backend holds no document registry. */
  docPath: string;
  filename: string;
  schema: string;
  instructions?: string;
  provider?: string;
  /** Optional model id. Only providers that publish a model list accept this;
   *  the backend returns 400 for anything outside its allowlist. */
  model?: string;
  includeConfidence?: boolean;
  includeSourceLocations?: boolean;
  includePageImages?: boolean;
  strict?: boolean;
};

export const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL ?? "http://localhost:8080";

export async function extractStructured(
  req: StructuredRequest,
): Promise<Envelope> {
  // The document is served statically from public/, so the browser fetches its
  // own copy and forwards the bytes. Nothing about the document is known to the
  // backend beforehand.
  const fileResp = await fetch(req.docPath);
  if (!fileResp.ok) {
    throw new Error(`could not load ${req.docPath}: ${fileResp.status}`);
  }
  const blob = await fileResp.blob();

  const form = new FormData();
  form.append(
    "file",
    new File([blob], req.filename, { type: "application/pdf" }),
  );
  // `json_schema`, not `schema`: FastAPI builds a body model from its Form
  // parameters, and both `schema` and `schema_json` shadow deprecated Pydantic
  // v1 methods still present on v2's BaseModel.
  form.append("json_schema", req.schema);
  form.append("instructions", req.instructions ?? "");

  const params = new URLSearchParams({
    provider: req.provider ?? "openai",
    includeConfidence: String(req.includeConfidence ?? true),
    includeSourceLocations: String(req.includeSourceLocations ?? true),
    includePageImages: String(req.includePageImages ?? false),
    strict: String(req.strict ?? false),
  });

  // Appended conditionally: sending an empty model would be rejected by the
  // allowlist, and providers with a single model accept no model param at all.
  // Forward the TRIMMED value — the guard checks `.trim()` but must also send
  // it, or a padded id (e.g. a stray trailing space) passes this check and
  // still earns a 400 from the backend allowlist.
  const trimmedModel = req.model?.trim();
  if (trimmedModel) params.set("model", trimmedModel);

  // No content-type header — the browser must set the multipart boundary.
  const resp = await fetch(`${API_BASE}/api/extraction/structured?${params}`, {
    method: "POST",
    body: form,
  });

  if (!resp.ok) {
    // FastAPI reports failures as {"detail": "..."}. Surfacing it matters here:
    // a missing `vision_vlm_data_extraction_api` entitlement is only
    // diagnosable from that message, and reads as a generic 500 without it.
    const detail = await resp
      .json()
      .then((b) => (typeof b?.detail === "string" ? b.detail : null))
      .catch(() => null);
    throw new Error(detail ?? `extract failed: ${resp.status}`);
  }
  return (await resp.json()) as Envelope;
}
