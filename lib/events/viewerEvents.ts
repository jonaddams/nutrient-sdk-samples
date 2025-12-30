import { TIMING, VIEWER_EVENTS } from "@/lib/constants";

// ============================================================================
// Typed Event System for Viewer Communication
// ============================================================================

export type ViewerEventType =
  (typeof VIEWER_EVENTS)[keyof typeof VIEWER_EVENTS];

export interface ViewerEventMap {
  [VIEWER_EVENTS.EDITING_STATE_CHANGE]: { isEditing: boolean };
  [VIEWER_EVENTS.SELECTED_BLOCKS_CHANGE]: { selectedCount: number };
  [VIEWER_EVENTS.CONTENT_EDITING_STATE_CHANGE]: { isContentEditing: boolean };
}

export type ViewerEventDetail<T extends ViewerEventType> =
  T extends keyof ViewerEventMap ? ViewerEventMap[T] : never;

/**
 * Dispatch a typed viewer event
 */
export function dispatchViewerEvent<T extends keyof ViewerEventMap>(
  eventType: T,
  detail: ViewerEventMap[T],
): void {
  window.dispatchEvent(
    new CustomEvent(eventType, {
      detail,
    }),
  );
}

/**
 * Dispatch a typed viewer event with a deferred timeout
 * Useful for ensuring state updates complete before event handlers run
 *
 * @param eventType - The type of event to dispatch
 * @param detail - The event detail payload
 * @param delay - Optional delay in ms (defaults to TIMING.EVENT_DEFER_MS)
 */
export function dispatchViewerEventDeferred<T extends keyof ViewerEventMap>(
  eventType: T,
  detail: ViewerEventMap[T],
  delay: number = TIMING.EVENT_DEFER_MS,
): void {
  setTimeout(() => {
    dispatchViewerEvent(eventType, detail);
  }, delay);
}

/**
 * Add a typed event listener for viewer events
 */
export function addViewerEventListener<T extends keyof ViewerEventMap>(
  eventType: T,
  handler: (detail: ViewerEventMap[T]) => void,
): () => void {
  const listener = ((event: CustomEvent<ViewerEventMap[T]>) => {
    handler(event.detail);
  }) as EventListener;

  window.addEventListener(eventType, listener);

  // Return cleanup function
  return () => window.removeEventListener(eventType, listener);
}

/**
 * Hook for listening to viewer events
 * Automatically manages event listener lifecycle
 *
 * @param eventType - The type of viewer event to listen for
 * @param handler - Callback function to handle the event
 * @param deps - Dependency list for the handler callback
 *
 * @example
 * ```typescript
 * useViewerEvent(
 *   VIEWER_EVENTS.EDITING_STATE_CHANGE,
 *   ({ isEditing }) => {
 *     console.log('Editing state:', isEditing);
 *   },
 *   []
 * );
 * ```
 */
export function useViewerEvent<T extends keyof ViewerEventMap>(
  eventType: T,
  handler: (detail: ViewerEventMap[T]) => void,
  deps: React.DependencyList = [],
): void {
  // Import React hooks at runtime to avoid bundling React in this module
  const { useEffect, useCallback } = require("react");

  // Memoize handler with provided dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedHandler = useCallback(handler, deps);

  useEffect(() => {
    // addViewerEventListener returns a cleanup function
    return addViewerEventListener(eventType, memoizedHandler);
  }, [eventType, memoizedHandler]);
}
