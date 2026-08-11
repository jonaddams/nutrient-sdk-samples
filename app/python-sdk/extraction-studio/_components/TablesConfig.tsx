"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchProviders, type ProviderInfo } from "../lib/providers";
import type { TablesRequest } from "../lib/tables";
import { Field } from "./Field";
import { PanelSection } from "./PanelSection";

/** The studio's provider ids that /api/extraction/tables can actually serve.
 *
 *  That endpoint takes `provider: "claude" | "openai"` and runs the
 *  VlmProvider.CLAUDE + get_claude_api_settings() path. /structured takes the
 *  flat ai.provider path and accepts bedrock and local as well — two
 *  mechanisms coexist in the backend and one file's pattern does not imply the
 *  other's. Offering Bedrock here would also hand the per-cell confidence view
 *  a wholly null confidenceComponents (SDK-048). */
const SUPPORTED = new Set(["openai", "anthropic"]);

/** The studio says "anthropic"; this endpoint only knows "claude". */
const WIRE_NAME: Record<string, string> = { anthropic: "claude" };

export function TablesConfig({
  docPath,
  filename,
  onRun,
  runSignal,
  onProvidersReady,
}: {
  docPath: string;
  filename: string;
  onRun: (req: TablesRequest) => void;
  runSignal: number;
  /** `false` while the fetch is in flight, after it fails, or when nothing it
   *  returned is usable here; `true` once a usable provider is selected. */
  onProvidersReady?: (ready: boolean) => void;
}) {
  const [provider, setProvider] = useState("openai");
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [providersFailed, setProvidersFailed] = useState(false);

  const usable = useMemo(
    () => (providers ?? []).filter((p) => SUPPORTED.has(p.id)),
    [providers],
  );

  // Deliberately mount-only, mirroring StructuredConfig: `provider` is read for
  // its value AT THE TIME THE FETCH RESOLVES, not as a reactive dependency —
  // adding it here would refetch on every selection change.
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
          // simply has neither OpenAI nor Claude configured. Distinguished from
          // providersFailed so the two can say different things.
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
        // Explicit rather than relying on the parent's initial state: Run must
        // stay gated after a failed fetch, not just before the first resolves.
        onProvidersReady?.(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
      provider: WIRE_NAME[provider] ?? provider,
    });
  }, [runSignal, docPath, filename, provider, onRun]);

  const loading = providers === null && !providersFailed;
  const nothingUsable = providers !== null && usable.length === 0;

  return (
    <PanelSection title="Configuration">
      <Field
        label="Provider"
        htmlFor="tables-provider"
        help={
          providersFailed
            ? "Could not reach the backend to see which providers it can serve."
            : loading
              ? "Checking which providers this backend can serve…"
              : nothingUsable
                ? undefined
                : "Table extraction reads the page with a vision model. This endpoint serves OpenAI and Claude."
        }
      >
        <select
          id="tables-provider"
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
            Table extraction needs OpenAI or Claude, and this backend has
            neither configured. Set <code>OPENAI_API_KEY</code> or{" "}
            <code>ANTHROPIC_API_KEY</code> and reload.
          </p>
        </div>
      )}

      {/* No other controls, and that is deliberate: /api/extraction/tables
          takes a file and a provider, full stop. Adding a knob that changes
          nothing is the mistake that retired the Multimodal toggle. */}
    </PanelSection>
  );
}
