"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type DescribeLevel,
  type DescribeRequest,
  PROMPT_PRESETS,
} from "../lib/describe";
import { fetchProviders, type ProviderInfo } from "../lib/providers";
import { Field } from "./Field";
import { PanelSection } from "./PanelSection";
import { Segmented } from "./Segmented";

/** The studio provider ids /api/extraction/describe can serve. It takes
 *  `provider` as a Form field and accepts claude|openai; Bedrock and Local run
 *  on a different mechanism entirely. */
const SUPPORTED = new Set(["openai", "anthropic"]);

/** The studio says "anthropic"; this endpoint only knows "claude". */
const WIRE_NAME: Record<string, string> = { anthropic: "claude" };

export function DescribeConfig({
  docPath,
  filename,
  onRun,
  runSignal,
  onProvidersReady,
}: {
  docPath: string;
  filename: string;
  onRun: (req: DescribeRequest) => void;
  runSignal: number;
  onProvidersReady?: (ready: boolean) => void;
}) {
  const [provider, setProvider] = useState("openai");
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [providersFailed, setProvidersFailed] = useState(false);
  const [level, setLevel] = useState<DescribeLevel>("standard");
  // Empty on purpose: an empty prompt is omitted from the request, so the
  // out-of-the-box demo exercises the SDK's own prompt rather than ours.
  const [prompt, setPrompt] = useState("");

  const usable = useMemo(
    () => (providers ?? []).filter((p) => SUPPORTED.has(p.id)),
    [providers],
  );

  // Deliberately mount-only, mirroring TablesConfig: `provider` is read for its
  // value AT THE TIME THE FETCH RESOLVES, not as a reactive dependency.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional mount-only fetch; `provider` and `onProvidersReady` are read fresh inside the callback.
  useEffect(() => {
    let cancelled = false;
    fetchProviders()
      .then((list) => {
        if (cancelled) return;
        setProviders(list);
        const offerable = list.filter((p) => SUPPORTED.has(p.id));
        if (offerable.length === 0) {
          // A legitimate answer, not a failure: the backend is healthy and
          // simply has neither provider configured. `provider` intentionally
          // keeps its initial value here — the select is disabled in this state
          // and the effect never re-runs, so the dangling value is inert, and
          // React does not warn for a value with no matching option.
          onProvidersReady?.(false);
          return;
        }
        const next = offerable.some((p) => p.id === provider)
          ? provider
          : offerable[0].id;
        setProvider(next);
        onProvidersReady?.(true);
      })
      .catch(() => {
        if (cancelled) return;
        setProvidersFailed(true);
        onProvidersReady?.(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Run lives in the panel head so it is reachable from the Results tab, so the
  // click arrives as an incrementing signal. Skip the initial render: 0 is not
  // a request to run.
  const lastSignal = useRef(runSignal);
  useEffect(() => {
    if (runSignal === lastSignal.current) return;
    lastSignal.current = runSignal;
    onRun({
      docPath,
      filename,
      provider: WIRE_NAME[provider] ?? provider,
      level,
      prompt,
    });
  }, [runSignal, docPath, filename, provider, level, prompt, onRun]);

  const loading = providers === null && !providersFailed;
  const nothingUsable = providers !== null && usable.length === 0;

  return (
    <PanelSection title="Configuration">
      <Field
        label="Provider"
        htmlFor="describe-provider"
        help={
          providersFailed
            ? "Could not reach the backend to see which providers it can serve."
            : loading
              ? "Checking which providers this backend can serve…"
              : nothingUsable
                ? undefined
                : "A vision model reads the page. This endpoint serves OpenAI and Claude."
        }
      >
        <select
          id="describe-provider"
          value={provider}
          aria-busy={loading || undefined}
          disabled={loading || providersFailed || nothingUsable}
          onChange={(e) => setProvider(e.target.value)}
        >
          {loading ? (
            // MUST carry `provider`'s current value: any other value leaves the
            // controlled select with no matching option and React renders the
            // first — of which there is none while loading.
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

      {nothingUsable && (
        <div className="callout" role="status">
          <span className="callout-label">No provider available</span>
          <p>
            Image description needs OpenAI or Claude, and this backend has
            neither configured. Set <code>OPENAI_API_KEY</code> or{" "}
            <code>ANTHROPIC_API_KEY</code> and reload.
          </p>
        </div>
      )}

      <Field
        label="Detail"
        help="Detailed spends more tokens and returns a longer description."
      >
        <Segmented
          label="Detail"
          options={[
            { label: "Standard", value: "standard" },
            { label: "Detailed", value: "detailed" },
          ]}
          value={level}
          onChange={setLevel}
        />
      </Field>

      <Field
        label="Prompt"
        htmlFor="describe-prompt"
        help="Leave empty to use the SDK's own description prompt. The presets are starting points — edit freely."
      >
        {/* Ordinary buttons, NOT a Segmented. Segmented renders aria-pressed,
            which asserts a mode — and that assertion goes false the instant the
            textarea is edited, announcing "Transcribe, pressed" while the
            prompt no longer matches it. These are load-this-text actions and
            hold no state. */}
        <div className="prompt-presets">
          {PROMPT_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="btn ghost sm"
              onClick={() => setPrompt(p.prompt)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <textarea
          id="describe-prompt"
          rows={4}
          value={prompt}
          placeholder="Describe this page for someone who cannot see it."
          onChange={(e) => setPrompt(e.target.value)}
        />
      </Field>
    </PanelSection>
  );
}
