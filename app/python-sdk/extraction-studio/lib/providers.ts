import { API_BASE } from "./api";

export type ModelInfo = { id: string; label: string };

export type ProviderInfo = {
  id: string;
  label: string;
  /** Empty for providers that take no model parameter. A length > 1 is what
   *  makes the UI render a model picker. */
  models: ModelInfo[];
  defaultModel: string;
};

/** Which providers the backend can actually serve. Availability is decided
 *  server-side from credential presence, so the studio never offers an option
 *  that would fail — notably "Local (LM Studio)", which cannot work on the
 *  hosted deployment. */
export async function fetchProviders(): Promise<ProviderInfo[]> {
  const resp = await fetch(`${API_BASE}/api/extraction/providers`);
  if (!resp.ok) {
    throw new Error(`could not load providers: ${resp.status}`);
  }
  let body: { providers?: ProviderInfo[] };
  try {
    body = (await resp.json()) as { providers?: ProviderInfo[] };
  } catch {
    // Invalid JSON is indistinguishable from a malformed response shape from the
    // caller's perspective — both mean the backend is broken.
    throw new Error("malformed providers response");
  }
  if (!Array.isArray(body?.providers)) {
    // Distinguished from an empty list on purpose: an empty list means "nothing
    // configured", which is a legitimate answer, while this means the backend
    // said something we do not understand.
    throw new Error("malformed providers response");
  }
  // Validate each ENTRY, not just the array. Previously only the outer shape was
  // checked, so an entry missing `models` reached the component and crashed
  // `.models.map` — a TypeError inside render rather than the handled
  // "providers failed" state this function exists to produce. The backend always
  // sends `models` and both sides ship together, so this is defence against a
  // future divergence rather than a live bug.
  //
  // Deliberately strict: a malformed entry rejects the whole response rather
  // than being filtered out. Silently dropping a provider would present a
  // shorter list as though it were complete, and "OpenAI is missing" is a much
  // worse failure to debug than "providers failed to load".
  for (const p of body.providers) {
    const valid =
      p &&
      typeof p.id === "string" &&
      typeof p.label === "string" &&
      typeof p.defaultModel === "string" &&
      Array.isArray(p.models) &&
      p.models.every(
        (m) => m && typeof m.id === "string" && typeof m.label === "string",
      );
    if (!valid) {
      throw new Error("malformed providers response");
    }
  }
  return body.providers;
}
