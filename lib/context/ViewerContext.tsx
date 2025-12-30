"use client";

import React, { createContext, useContext, useState } from "react";
import type { Instance } from "@nutrient-sdk/viewer";
import type { ContentEditingSession } from "@/lib/types/nutrient";

// ============================================================================
// Viewer Context - Replaces global window.viewerInstance
// ============================================================================

interface ViewerContextValue {
  instance: Instance | null;
  setInstance: (instance: Instance | null) => void;
  session: ContentEditingSession | null;
  setSession: (session: ContentEditingSession | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  error: Error | null;
  setError: (error: Error | null) => void;
}

const ViewerContext = createContext<ViewerContextValue | null>(null);

/**
 * ViewerProvider - Provides viewer instance and session to all child components
 * Replaces the global window.viewerInstance pattern
 */
export function ViewerProvider({ children }: { children: React.ReactNode }) {
  const [instance, setInstance] = useState<Instance | null>(null);
  const [session, setSession] = useState<ContentEditingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const value: ViewerContextValue = {
    instance,
    setInstance,
    session,
    setSession,
    isLoading,
    setIsLoading,
    error,
    setError,
  };

  return (
    <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>
  );
}

/**
 * Hook to access viewer instance and state
 * Throws error if used outside ViewerProvider
 */
export function useViewer(): ViewerContextValue {
  const context = useContext(ViewerContext);

  if (!context) {
    throw new Error("useViewer must be used within ViewerProvider");
  }

  return context;
}

/**
 * Hook with safe fallback for optional viewer access
 */
export function useViewerOptional(): ViewerContextValue | null {
  return useContext(ViewerContext);
}

/**
 * Backward compatibility: Still expose instance on window for legacy code
 * This allows gradual migration from window.viewerInstance to useViewer()
 */
export function useSyncViewerToWindow() {
  const { instance } = useViewer();

  React.useEffect(() => {
    if (instance) {
      window.viewerInstance = instance;
    }

    return () => {
      if (window.viewerInstance === instance) {
        window.viewerInstance = undefined;
      }
    };
  }, [instance]);
}
