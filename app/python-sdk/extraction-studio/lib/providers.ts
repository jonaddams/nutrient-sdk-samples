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
  const body = (await resp.json()) as { providers?: ProviderInfo[] };
  if (!Array.isArray(body?.providers)) {
    // Distinguished from an empty list on purpose: an empty list means "nothing
    // configured", which is a legitimate answer, while this means the backend
    // said something we do not understand.
    throw new Error("malformed providers response");
  }
  return body.providers;
}
