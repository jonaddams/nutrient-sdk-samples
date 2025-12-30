"use client";

import { Component, type ReactNode } from "react";
import { logError } from "@/lib/utils/errorHandler";
import styles from "./ErrorBoundary.module.css";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches React errors in child component tree and displays fallback UI
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error with component stack
    logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className={styles.errorContainer}>
          <h2 className={styles.errorTitle}>Something went wrong</h2>
          <p className={styles.errorMessage}>
            An error occurred while rendering this component. Please try
            refreshing the page.
          </p>
          {this.state.error && process.env.NODE_ENV === "development" && (
            <details className={styles.errorDetails}>
              <summary className={styles.errorSummary}>Error details</summary>
              <pre className={styles.errorPre}>
                {this.state.error.message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={styles.errorButton}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Reusable error fallback component
 * @param props - Component props
 * @param props.error - Error object to display
 * @param props.resetError - Function to reset error state
 */
export function ErrorFallback({
  error,
  resetError,
}: {
  error?: Error;
  resetError?: () => void;
}) {
  return (
    <div className={styles.errorContainerCentered}>
      <h2 className={styles.errorTitleLarge}>Oops! Something went wrong</h2>
      <p className={styles.errorMessageSmall}>
        We encountered an unexpected error. Please try again.
      </p>
      {error && <p className={styles.errorMessageCode}>{error.message}</p>}
      <div className={styles.buttonGroup}>
        {resetError && (
          <button
            type="button"
            onClick={resetError}
            className={styles.errorButton}
          >
            Try Again
          </button>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={styles.errorButtonSecondary}
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}
