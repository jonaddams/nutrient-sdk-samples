"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { HandwritingEngine, HandwritingRequest } from "../lib/handwriting";
import { fetchProviders, type ProviderInfo } from "../lib/providers";
import { Field } from "./Field";
import { PanelSection } from "./PanelSection";
import { Segmented } from "./Segmented";

/** The studio's provider ids /api/extraction/vlm can actually serve.
 *
 *  That endpoint takes `provider: "claude" | "openai"` as a QUERY parameter and
 *  raises on anything else. /structured takes the flat ai.provider path and
 *  accepts bedrock and local as well — two mechanisms coexist in the backend
 *  and one file's pattern does not imply the other's. */
const SUPPORTED = new Set(["openai", "anthropic"]);

/** The studio says "anthropic"; this endpoint only knows "claude". */
const WIRE_NAME: Record<string, string> = { anthropic: "claude" };

export function HandwritingConfig({
  docPath,
  filename,
  onRun,
  runSignal,
  onProvidersReady,
}: {
  docPath: string;
  filename: string;
  onRun: (req: HandwritingRequest) => void;
  runSignal: number;
  /** Engine-dependent here, unlike every other config panel: Local ICR needs no
   *  provider at all, so it reports ready on mount. */
  onProvidersReady?: (ready: boolean) => void;
}) {
  const [engine, setEngine] = useState<HandwritingEngine>("local");
  const [provider, setProvider] = useState("openai");
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [providersFailed, setProvidersFailed] = useState(false);
  /** Null while the fetch is in flight. Kept separate from calling
   *  onProvidersReady inside the fetch, because readiness here also depends on
   *  `engine`, which can change long after the fetch resolves. */
  const [providersOk, setProvidersOk] = useState<boolean | null>(null);

  const usable = useMemo(
    () => (providers ?? []).filter((p) => SUPPORTED.has(p.id)),
    [providers],
  );

  // Deliberately mount-only, mirroring TablesConfig: `provider` is read for its
  // value AT THE TIME THE FETCH RESOLVES, not as a reactive dependency — adding
  // it here would refetch on every selection change. Fetched even in local
  // mode, so switching to VLM-enhanced finds the list already there.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only fetch; `provider` is read fresh inside the callback.
  useEffect(() => {
    let cancelled = false;
    fetchProviders()
      .then((list) => {
        if (cancelled) return;
        setProviders(list);
        const offerable = list.filter((p) => SUPPORTED.has(p.id));
        if (offerable.length === 0) {
          // A legitimate answer, not a failure: the backend is healthy and
          // simply has neither OpenAI nor Claude configured. Local ICR still
          // works, which is exactly why readiness is computed below rather
          // than asserted here.
          setProvidersOk(false);
          return;
        }
        setProvider((current) =>
          offerable.some((p) => p.id === current) ? current : offerable[0].id,
        );
        setProvidersOk(true);
      })
      .catch(() => {
        if (cancelled) return;
        setProvidersFailed(true);
        setProvidersOk(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Readiness is a function of the engine, which is what makes this panel
  // different from Tables' and Describe's. Local ICR sends no provider and
  // needs no credentials, so it is ready immediately and stays ready on a
  // backend with no keys at all. Only VLM-enhanced waits.
  useEffect(() => {
    onProvidersReady?.(engine === "local" ? true : providersOk === true);
  }, [engine, providersOk, onProvidersReady]);

  // `Run extraction` lives in the panel head so it is reachable from the
  // Results tab too, so the click arrives as an incrementing signal rather
  // than a direct call. Skip the initial render: 0 is not a request to run.
  const lastSignal = useRef(runSignal);
  useEffect(() => {
    if (runSignal === lastSignal.current) return;
    lastSignal.current = runSignal;
    onRun({
      docPath,
      filename,
      engine,
      provider: WIRE_NAME[provider] ?? provider,
    });
  }, [runSignal, docPath, filename, engine, provider, onRun]);

  const loading = providers === null && !providersFailed;
  const nothingUsable = providers !== null && usable.length === 0;

  return (
    <PanelSection title="Recognition">
      {/* No htmlFor: Segmented takes no id prop and renders no element with
          one, so pointing Field's <label for> at it would be a dangling
          reference. Segmented names its own role="group" via `label`. */}
      <Field
        label="Engine"
        help="Local reads the page on this machine — nothing leaves your network. It handles hand-lettered print well and joined-up writing poorly. VLM-enhanced sends the page to a vision model, which reads the cursive the local engine cannot."
      >
        <Segmented
          label="Engine"
          options={[
            { label: "Local ICR", value: "local" },
            { label: "VLM-enhanced", value: "vlm" },
          ]}
          value={engine}
          onChange={(v) => setEngine(v as HandwritingEngine)}
        />
      </Field>

      {engine === "vlm" && (
        <Field
          label="Provider"
          htmlFor="handwriting-provider"
          help={
            providersFailed
              ? "Could not reach the backend to see which providers it can serve."
              : loading
                ? "Checking which providers this backend can serve…"
                : nothingUsable
                  ? undefined
                  : "The vision model that checks the local reading. This endpoint serves OpenAI and Claude."
          }
        >
          <select
            id="handwriting-provider"
            value={provider}
            aria-busy={loading || undefined}
            disabled={loading || providersFailed || nothingUsable}
            onChange={(e) => setProvider(e.target.value)}
          >
            {loading ? (
              // MUST carry `provider`'s current value: any other value leaves
              // the controlled select with no matching option and React renders
              // the first — of which there is none while loading.
              <option value={provider}>Loading providers…</option>
            ) : (
              usable.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))
            )}
          </select>
        </Field>
      )}

      {engine === "vlm" && nothingUsable && (
        <div className="callout" role="status">
          <span className="callout-label">No provider available</span>
          <p>
            VLM-enhanced reading needs OpenAI or Claude, and this backend has
            neither configured. Set <code>OPENAI_API_KEY</code> or{" "}
            <code>ANTHROPIC_API_KEY</code> and reload, or switch to Local ICR,
            which needs no credentials.
          </p>
        </div>
      )}

      {/* No other controls, and that is deliberate: /api/extraction/icr takes a
          file and nothing else, and /vlm takes a file and a provider. Adding a
          knob that changes nothing is the mistake that retired the Multimodal
          toggle. */}
    </PanelSection>
  );
}
