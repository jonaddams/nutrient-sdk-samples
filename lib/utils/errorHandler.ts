/**
 * Centralized Error Handler Utility
 * Provides consistent error handling and user-friendly error messages
 */

/**
 * Error types for categorizing different kinds of errors
 */
export enum ErrorType {
  VIEWER_INITIALIZATION = "VIEWER_INITIALIZATION",
  SESSION_MANAGEMENT = "SESSION_MANAGEMENT",
  TEXT_DETECTION = "TEXT_DETECTION",
  TEXT_REPLACEMENT = "TEXT_REPLACEMENT",
  ANNOTATION = "ANNOTATION",
  NETWORK = "NETWORK",
  UNKNOWN = "UNKNOWN",
}

/**
 * Error codes for programmatic error handling
 * Format: ERR_[CATEGORY]_[SPECIFIC_ERROR]
 */
export enum ErrorCode {
  // Viewer initialization errors (1000-1099)
  ERR_VIEWER_INIT_FAILED = "ERR_VIEWER_INIT_1000",
  ERR_VIEWER_NOT_AVAILABLE = "ERR_VIEWER_INIT_1001",

  // Session management errors (2000-2099)
  ERR_SESSION_CREATE_FAILED = "ERR_SESSION_2000",
  ERR_SESSION_COMMIT_FAILED = "ERR_SESSION_2001",
  ERR_SESSION_DISCARD_FAILED = "ERR_SESSION_2002",
  ERR_SESSION_IN_PROGRESS = "ERR_SESSION_2003",
  ERR_SESSION_NOT_FOUND = "ERR_SESSION_2004",

  // Text detection errors (3000-3099)
  ERR_TEXT_DETECTION_FAILED = "ERR_TEXT_3000",
  ERR_TEXT_NO_BLOCKS_FOUND = "ERR_TEXT_3001",

  // Text replacement errors (4000-4099)
  ERR_TEXT_REPLACE_FAILED = "ERR_TEXT_4000",
  ERR_TEXT_UPDATE_FAILED = "ERR_TEXT_4001",

  // Annotation errors (5000-5099)
  ERR_ANNOTATION_CREATE_FAILED = "ERR_ANNOTATION_5000",
  ERR_ANNOTATION_UPDATE_FAILED = "ERR_ANNOTATION_5001",

  // Network errors (6000-6099)
  ERR_NETWORK_REQUEST_FAILED = "ERR_NETWORK_6000",
  ERR_NETWORK_TIMEOUT = "ERR_NETWORK_6001",
  ERR_NETWORK_CONNECTION = "ERR_NETWORK_6002",

  // Unknown/Generic errors (9000-9099)
  ERR_UNKNOWN = "ERR_UNKNOWN_9000",
}

/**
 * Application error with type, code, and context
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public originalError?: unknown,
    public context?: Record<string, unknown>,
    public code?: ErrorCode,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * User-friendly error messages for each error type
 */
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.VIEWER_INITIALIZATION]:
    "Failed to initialize PDF viewer. Please refresh the page and try again.",
  [ErrorType.SESSION_MANAGEMENT]:
    "Unable to manage editing session. Please try again.",
  [ErrorType.TEXT_DETECTION]:
    "Unable to detect text in the document. Please ensure the PDF contains selectable text.",
  [ErrorType.TEXT_REPLACEMENT]: "Failed to replace text. Please try again.",
  [ErrorType.ANNOTATION]:
    "Unable to create or update annotations. Please try again.",
  [ErrorType.NETWORK]:
    "Network error occurred. Please check your connection and try again.",
  [ErrorType.UNKNOWN]:
    "An unexpected error occurred. Please try again or contact support.",
};

/**
 * Get user-friendly error message for an error
 * @param error - Error object or unknown error
 * @returns User-friendly error message
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message || ERROR_MESSAGES[error.type];
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for specific error patterns with more precise matching
    if (
      message.includes("network error") ||
      message.includes("fetch failed") ||
      message.includes("connection refused") ||
      message.includes("timeout")
    ) {
      return ERROR_MESSAGES[ErrorType.NETWORK];
    }

    if (
      message.includes("session") &&
      (message.includes("create") ||
        message.includes("commit") ||
        message.includes("discard") ||
        message.includes("already in progress"))
    ) {
      return ERROR_MESSAGES[ErrorType.SESSION_MANAGEMENT];
    }

    if (
      message.includes("text") &&
      (message.includes("detect") || message.includes("block"))
    ) {
      return ERROR_MESSAGES[ErrorType.TEXT_DETECTION];
    }

    if (
      message.includes("replace") ||
      (message.includes("update") && message.includes("text"))
    ) {
      return ERROR_MESSAGES[ErrorType.TEXT_REPLACEMENT];
    }

    if (message.includes("annotation") || message.includes("markup")) {
      return ERROR_MESSAGES[ErrorType.ANNOTATION];
    }
  }

  return ERROR_MESSAGES[ErrorType.UNKNOWN];
}

/**
 * Log error with context information
 * @param error - Error to log
 * @param context - Additional context
 */
export function logError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString();
  const errorInfo = {
    timestamp,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
    context,
  };

  // In production, this would send to error tracking service
  // For now, we'll use console.error
  console.error("[Error Handler]", errorInfo);
}

/**
 * Handle error with logging and user feedback
 * @param error - Error to handle
 * @param context - Additional context
 * @returns User-friendly error message
 */
export function handleError(
  error: unknown,
  context?: Record<string, unknown>,
): string {
  logError(error, context);
  return getUserFriendlyMessage(error);
}

/**
 * Create an AppError from an unknown error
 * @param type - Error type
 * @param error - Original error
 * @param context - Additional context
 * @returns AppError instance
 */
export function createAppError(
  type: ErrorType,
  error: unknown,
  context?: Record<string, unknown>,
): AppError {
  const message = ERROR_MESSAGES[type];
  return new AppError(type, message, error, context);
}

/**
 * Wrap an async function with error handling
 * @param fn - Async function to wrap
 * @param errorType - Type of error to create if function fails
 * @param context - Additional context
 * @returns Wrapped function
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorType: ErrorType,
  context?: Record<string, unknown>,
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      throw createAppError(errorType, error, {
        ...context,
        args,
      });
    }
  }) as T;
}

/**
 * Check if error is of a specific type
 * @param error - Error to check
 * @param type - Error type to match
 * @returns True if error matches type
 */
export function isErrorType(error: unknown, type: ErrorType): boolean {
  return error instanceof AppError && error.type === type;
}

/**
 * Retry async function with exponential backoff
 * @param fn - Function to retry
 * @param maxAttempts - Maximum retry attempts (default: 3)
 * @param delayMs - Initial delay in milliseconds (default: 1000)
 * @param signal - Optional AbortSignal to cancel retry operation
 * @returns Result of function
 * @throws Error if aborted or all attempts fail
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 1000,
  signal?: AbortSignal,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Check if operation was aborted
    if (signal?.aborted) {
      throw new Error("Operation aborted");
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = delayMs * 2 ** (attempt - 1);

      // Use AbortSignal-aware delay if signal provided
      if (signal) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(resolve, delay);
          const abortHandler = () => {
            clearTimeout(timeout);
            reject(new Error("Operation aborted"));
          };
          signal.addEventListener("abort", abortHandler, { once: true });
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
