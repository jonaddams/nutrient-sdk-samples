"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MarkdownRequest } from "../lib/markdown";
import { fetchProviders, type ProviderInfo } from "../lib/providers";
import { Field } from "./Field";
import { PanelSection } from "./PanelSection";

/** The studio provider ids /api/extraction/markdown can serve. It takes
 *  `provider` as a QUERY parameter and accepts claude|openai; Bedrock and Local
 *  run on a different mechanism entirely. */
const SUPPORTED = new Set(["openai", "anthropic"]);

/** The studio says "anthropic"; this endpoint only knows "claude". */
const WIRE_NAME: Record<string, string> = { anthropic: "claude" };

export function MarkdownConfig({
  docPath,
  filename,
  onRun,
  runSignal,
  onProvidersReady,
}: {
  docPath: string;
  filename: string;
  onRun: (req: MarkdownRequest) => void;
  runSignal: number;
  onProvidersReady?: (ready: boolean) => void;
}) {
  const [provider, setProvider] = useState("openai");
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);
  const [providersFailed, setProvidersFailed] = useState(false);

  const usable = useMemo(
    () => (providers ?? []).filter((p) => SUPPORTED.has(p.id)),
    [providers],
  );

  // Deliberately mount-only, mirroring DescribeConfig: `provider` is read for
  // its value AT THE TIME THE FETCH RESOLVES, not as a reactive dependency.
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
          // simply has neither provider configured.
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
    });
  }, [runSignal, docPath, filename, provider, onRun]);

  const loading = providers === null && !providersFailed;
  const nothingUsable = providers !== null && usable.length === 0;

  return (
    <PanelSection title="Configuration">
      <Field
        label="Provider"
        htmlFor="markdown-provider"
        help={
          providersFailed
            ? "Could not reach the backend to see which providers it can serve."
            : loading
              ? "Checking which providers this backend can serve…"
              : nothingUsable
                ? undefined
                : "A vision model reads each page and writes it as Markdown. This endpoint serves OpenAI and Claude."
        }
      >
        <select
          id="markdown-provider"
          value={provider}
          aria-busy={loading || undefined}
          disabled={loading || providersFailed || nothingUsable}
          onChange={(e) => setProvider(e.target.value)}
        >
          {loading ? (
            // MUST carry `provider`'s current value: any other value leaves the
            // controlled select with no matching option.
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
            Markdown export needs OpenAI or Claude, and this backend has neither
            configured. Set <code>OPENAI_API_KEY</code> or{" "}
            <code>ANTHROPIC_API_KEY</code> and reload.
          </p>
        </div>
      )}
    </PanelSection>
  );
}
