"use client";

import { useCallback, useState } from "react";
import {
  assembleOutcomes,
  type Outcomes,
  type Provider,
  type ProviderMode,
  providersFor,
} from "./providers";

/**
 * Runs a page-supplied request function against one or both providers.
 * Both mode runs in parallel (total wait = slower provider, not the sum).
 * A rejected request becomes an error outcome; partial results survive.
 */
export function useProviderRun<T>() {
  const [loading, setLoading] = useState(false);
  const [outcomes, setOutcomes] = useState<Outcomes<T>>({});

  const runAll = useCallback(
    async (mode: ProviderMode, fn: (provider: Provider) => Promise<T>) => {
      const providers = providersFor(mode);
      setLoading(true);
      setOutcomes({});
      try {
        const settled = await Promise.allSettled(
          providers.map(async (provider) => {
            const start = performance.now();
            const data = await fn(provider);
            return { data, ms: performance.now() - start };
          }),
        );
        setOutcomes(assembleOutcomes(providers, settled));
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => setOutcomes({}), []);

  return { runAll, loading, outcomes, reset };
}
