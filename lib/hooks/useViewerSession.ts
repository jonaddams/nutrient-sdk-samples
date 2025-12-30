"use client";

import { useCallback, useRef, useState } from "react";
import { useViewer } from "@/lib/context/ViewerContext";
import type { ContentEditingSession } from "@/lib/types/nutrient";
import { createAppError, ErrorType } from "@/lib/utils/errorHandler";
import { measurePerformance } from "@/lib/utils/performanceMonitor";

/**
 * Hook for managing content editing sessions with Nutrient SDK
 * Handles complete session lifecycle: creation, commit, discard, and cleanup
 * Includes session creation lock to prevent race conditions
 *
 * @returns Object containing session management functions and loading states
 * @property {Function} beginSession - Create and return a new content editing session
 * @property {Function} commitSession - Commit current session changes to the document
 * @property {Function} discardSession - Discard current session without applying changes
 * @property {Function} getSession - Get reference to the current active session
 * @property {Function} hasActiveSession - Check if there's an active session
 * @property {boolean} isCreatingSession - Whether a session is currently being created
 * @property {boolean} isCommitting - Whether a session commit is in progress
 * @property {boolean} isDiscarding - Whether a session discard is in progress
 *
 * @example
 * ```tsx
 * const {
 *   beginSession,
 *   commitSession,
 *   discardSession,
 *   hasActiveSession,
 *   isCreatingSession,
 *   isCommitting
 * } = useViewerSession();
 *
 * // Start a new session
 * try {
 *   const session = await beginSession();
 * } catch (error) {
 *   // Handle error (e.g., session creation already in progress)
 * }
 *
 * // Make changes using the session...
 *
 * // Commit the changes
 * await commitSession();
 *
 * // Or discard if needed
 * await discardSession();
 *
 * // Disable UI during operations
 * <button disabled={isCreatingSession || isCommitting}>
 *   {isCommitting ? "Saving..." : "Save Changes"}
 * </button>
 * ```
 */
export function useViewerSession() {
  const { instance } = useViewer();
  const activeSessionRef = useRef<ContentEditingSession | null>(null);
  const isCreatingSessionRef = useRef(false);

  // Loading states for UI feedback
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  /**
   * Begin a new content editing session
   * Automatically cleans up any existing session before creating a new one
   * Prevents race conditions with session creation lock
   * @returns Promise resolving to the new ContentEditingSession
   * @throws AppError if viewer instance is not available, session creation fails,
   *         or another session creation is already in progress
   */
  const beginSession = useCallback(async () => {
    if (!instance) {
      throw createAppError(
        ErrorType.VIEWER_INITIALIZATION,
        new Error("Viewer instance not available"),
        { operation: "beginSession" },
      );
    }

    // Prevent concurrent session creation
    if (isCreatingSessionRef.current) {
      throw createAppError(
        ErrorType.SESSION_MANAGEMENT,
        new Error("Session creation already in progress"),
        { operation: "beginSession" },
      );
    }

    isCreatingSessionRef.current = true;
    setIsCreatingSession(true);

    try {
      // Clean up any existing session first
      if (activeSessionRef.current) {
        try {
          await activeSessionRef.current.discard();
        } catch (error) {
          console.warn("Error cleaning up previous session:", error);
        }
        activeSessionRef.current = null;
      }

      // Create new session with performance monitoring
      const { result: session } = await measurePerformance(
        "beginContentEditingSession",
        async () => await instance.beginContentEditingSession(),
        undefined,
        { warning: 500, error: 2000 },
      );

      activeSessionRef.current = session;
      return session;
    } catch (error) {
      throw createAppError(ErrorType.SESSION_MANAGEMENT, error, {
        operation: "beginSession",
      });
    } finally {
      isCreatingSessionRef.current = false;
      setIsCreatingSession(false);
    }
  }, [instance]);

  /**
   * Commit the current session changes to the document
   * Applies all modifications and closes the session
   * @throws AppError if no active session exists or commit fails
   */
  const commitSession = useCallback(async () => {
    if (!activeSessionRef.current) {
      throw createAppError(
        ErrorType.SESSION_MANAGEMENT,
        new Error("No active session to commit"),
        { operation: "commitSession" },
      );
    }

    const session = activeSessionRef.current;
    setIsCommitting(true);

    try {
      await measurePerformance(
        "commitContentEditingSession",
        async () => await session.commit(),
        undefined,
        { warning: 1000, error: 5000 },
      );
      activeSessionRef.current = null;
    } catch (error) {
      throw createAppError(ErrorType.SESSION_MANAGEMENT, error, {
        operation: "commitSession",
      });
    } finally {
      setIsCommitting(false);
    }
  }, []);

  /**
   * Discard the current session changes without applying them
   * Safely handles cases where no active session exists
   */
  const discardSession = useCallback(async () => {
    if (!activeSessionRef.current) {
      return; // Nothing to discard
    }

    setIsDiscarding(true);

    try {
      await activeSessionRef.current.discard();
    } catch (error) {
      console.warn("Error discarding session:", error);
    } finally {
      activeSessionRef.current = null;
      setIsDiscarding(false);
    }
  }, []);

  /**
   * Get the current active session
   * @returns The active ContentEditingSession or null if none exists
   */
  const getSession = useCallback((): ContentEditingSession | null => {
    return activeSessionRef.current;
  }, []);

  /**
   * Check if there's an active session
   * @returns True if a session is active, false otherwise
   */
  const hasActiveSession = useCallback(() => {
    return activeSessionRef.current !== null;
  }, []);

  return {
    beginSession,
    commitSession,
    discardSession,
    getSession,
    hasActiveSession,
    isCreatingSession,
    isCommitting,
    isDiscarding,
  };
}
