/** Provider selection + outcome plumbing for the VLM demo pages. */

export type Provider = "claude" | "openai";
export type ProviderMode = Provider | "both";

export const PROVIDERS: readonly Provider[] = ["claude", "openai"] as const;

export const PROVIDER_LABELS: Record<Provider, string> = {
  claude: "Claude",
  openai: "OpenAI",
};

export function providersFor(mode: ProviderMode): Provider[] {
  return mode === "both" ? [...PROVIDERS] : [mode];
}

export type Outcome<T> =
  | { status: "ok"; data: T; ms: number }
  | { status: "error"; message: string };

export type Outcomes<T> = Partial<Record<Provider, Outcome<T>>>;

/** Pure assembly of settled per-provider results into an outcomes map. */
export function assembleOutcomes<T>(
  providers: Provider[],
  settled: PromiseSettledResult<{ data: T; ms: number }>[],
): Outcomes<T> {
  const out: Outcomes<T> = {};
  providers.forEach((provider, i) => {
    const s = settled[i];
    out[provider] =
      s.status === "fulfilled"
        ? { status: "ok", data: s.value.data, ms: s.value.ms }
        : {
            status: "error",
            message:
              s.reason instanceof Error ? s.reason.message : String(s.reason),
          };
  });
  return out;
}

/** Ordered entries (claude first) for rendering result panels. */
export function outcomeEntries<T>(
  outcomes: Outcomes<T>,
): [Provider, Outcome<T>][] {
  return PROVIDERS.filter((p) => outcomes[p] !== undefined).map((p) => [
    p,
    outcomes[p] as Outcome<T>,
  ]);
}

/** "4234 -> 4.2s" — per-provider timing badge text. */
export function formatTiming(ms: number): string {
  // Math.round half-up first: a plain (ms / 1000).toFixed(1) fails at e.g.
  // 950ms because IEEE-754 stores 0.95 as 0.9499... and toFixed rounds DOWN.
  return `${(Math.round(ms / 100) / 10).toFixed(1)}s`;
}
