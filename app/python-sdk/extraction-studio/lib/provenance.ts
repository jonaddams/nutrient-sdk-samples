/**
 * Human labels for the "what produced this result" line each results panel
 * carries.
 *
 * Every panel already reported how long a run took and how much it returned;
 * none reported what ran. That is fine when the configuration is on screen and
 * misleading when it is not — `Run extraction` lives in the panel head, so it
 * is reachable from the Results tab with the config panel hidden, and a
 * screenshot or a scroll-back has no record of the provider, model, engine or
 * languages that produced what it shows.
 *
 * Two vocabularies reach these functions and neither is presentable as-is.
 * `/structured` uses the studio's own provider ids (`anthropic`, `bedrock`,
 * `local`); `/tables`, `/describe` and `/vlm` use the wire names those map to
 * (`claude`). Both are accepted here so no call site has to know which it
 * holds.
 */

const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  // Both spellings on purpose: the studio says "anthropic", three endpoints
  // say "claude", and a results panel should not expose that seam.
  anthropic: "Claude",
  claude: "Claude",
  bedrock: "AWS Bedrock",
  local: "Local model",
};

/** Display name for a provider id, in either vocabulary.
 *
 *  Falls back to the raw id rather than to "Unknown": a provider we have not
 *  labelled yet is still information, and hiding it would make the line lie by
 *  omission — which is the whole failure this module exists to fix. */
export function providerLabel(id: string | undefined): string | null {
  if (!id) return null;
  return PROVIDER_LABELS[id] ?? id;
}

/** Display name for a handwriting engine.
 *
 *  Keyed on the backend's `config.engine` (`"ICR"` / `"VLM"`), not on the
 *  studio's own `"local"` / `"vlm"` request ids, so the label describes the run
 *  that came back rather than whatever the toggle currently reads. */
export function engineLabel(engine: string | undefined): string | null {
  if (engine === "ICR") return "Local ICR";
  if (engine === "VLM") return "VLM-enhanced";
  return engine ?? null;
}

/** "eng+deu" as "eng + deu", so the meta row does not read as one token.
 *
 *  The separator is the SDK's, and it is load-bearing — a comma or a space
 *  makes the SDK return an empty document silently — so it is shown rather
 *  than replaced with a comma. */
export function languagesLabel(languages: string | undefined): string | null {
  if (!languages) return null;
  return languages.split("+").join(" + ");
}
