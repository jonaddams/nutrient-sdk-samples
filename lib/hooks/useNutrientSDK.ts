"use client";

import { useEffect, useState, useCallback } from "react";
import type { NutrientInstance } from "@/lib/types/nutrient";
import { SDK_LOADING, getTheme, NUTRIENT_SDK } from "@/lib/constants";

interface UseNutrientSDKOptions {
  container: HTMLElement | null;
  document: string;
  licenseKey?: string;
  toolbarItems?: unknown[];
  onLoad?: (instance: NutrientInstance) => void;
  onError?: (error: Error) => void;
}

interface UseNutrientSDKResult {
  instance: NutrientInstance | null;
  loading: boolean;
  error: Error | null;
}

export function useNutrientSDK({
  container,
  document: documentPath,
  licenseKey = NUTRIENT_SDK.LICENSE_KEY,
  toolbarItems,
  onLoad,
  onError,
}: UseNutrientSDKOptions): UseNutrientSDKResult {
  const [instance, setInstance] = useState<NutrientInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSDK = useCallback(async () => {
    if (!container) return;

    let retries = 0;
    const checkSDK = () => {
      if (window.NutrientViewer) {
        return true;
      }
      retries++;
      return retries >= SDK_LOADING.MAX_RETRIES;
    };

    // Poll for SDK availability
    while (!checkSDK()) {
      await new Promise((resolve) =>
        setTimeout(resolve, SDK_LOADING.POLL_INTERVAL_MS)
      );
    }

    if (!window.NutrientViewer) {
      const err = new Error("Nutrient SDK failed to load");
      setError(err);
      setLoading(false);
      onError?.(err);
      return;
    }

    try {
      const theme = getTheme();
      const loadedInstance = await window.NutrientViewer.load({
        container,
        document: documentPath,
        licenseKey,
        useCDN: true,
        theme:
          theme === "DARK"
            ? window.NutrientViewer.Theme.DARK
            : window.NutrientViewer.Theme.LIGHT,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(toolbarItems && { toolbarItems: toolbarItems as any }),
      });

      setInstance(loadedInstance);
      setLoading(false);
      onLoad?.(loadedInstance);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setLoading(false);
      onError?.(error);
    }
  }, [container, documentPath, licenseKey, toolbarItems, onLoad, onError]);

  useEffect(() => {
    loadSDK();

    return () => {
      if (instance) {
        instance.destroy();
      }
    };
  }, [loadSDK]);

  return { instance, loading, error };
}
