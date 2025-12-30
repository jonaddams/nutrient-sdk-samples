# Error Handling Guide

**Last Updated**: December 29, 2025

This document standardizes error handling patterns across the Nutrient SDK Samples application.

---

## Table of Contents

1. [Error Handling Philosophy](#error-handling-philosophy)
2. [Error Types and Hierarchy](#error-types-and-hierarchy)
3. [Pattern Selection Guide](#pattern-selection-guide)
4. [Implementation Patterns](#implementation-patterns)
5. [Error Display Guidelines](#error-display-guidelines)
6. [Testing Error Scenarios](#testing-error-scenarios)
7. [Common Pitfalls](#common-pitfalls)

---

## Error Handling Philosophy

### Core Principles

1. **User-Centric**: Show helpful, actionable messages to users
2. **Developer-Friendly**: Provide detailed context for debugging
3. **Type-Safe**: Use TypeScript enums and types for error categorization
4. **Recoverable**: Allow graceful degradation where possible
5. **Observable**: Log errors for monitoring and analytics

### Three-Layer Architecture

```
┌─────────────────────────────────────┐
│   User Interface (Components)       │  ← Display user-friendly messages
├─────────────────────────────────────┤
│   Business Logic (Hooks/Utils)      │  ← Throw typed errors with context
├─────────────────────────────────────┤
│   Error Infrastructure (Handlers)   │  ← Centralized logging & formatting
└─────────────────────────────────────┘
```

---

## Error Types and Hierarchy

### ErrorType Enum

All errors are categorized using the `ErrorType` enum:

```typescript
enum ErrorType {
  VIEWER_INITIALIZATION = "VIEWER_INITIALIZATION",
  SESSION_MANAGEMENT = "SESSION_MANAGEMENT",
  TEXT_DETECTION = "TEXT_DETECTION",
  TEXT_REPLACEMENT = "TEXT_REPLACEMENT",
  ANNOTATION = "ANNOTATION",
  NETWORK = "NETWORK",
  UNKNOWN = "UNKNOWN",
}
```

### ErrorCode Enum

For programmatic error handling, use specific error codes:

```typescript
enum ErrorCode {
  // Viewer initialization errors (1000-1099)
  ERR_VIEWER_INIT_FAILED = "ERR_VIEWER_INIT_1000",
  ERR_VIEWER_NOT_AVAILABLE = "ERR_VIEWER_INIT_1001",

  // Session management errors (2000-2099)
  ERR_SESSION_CREATE_FAILED = "ERR_SESSION_2000",
  ERR_SESSION_COMMIT_FAILED = "ERR_SESSION_2001",
  ERR_SESSION_IN_PROGRESS = "ERR_SESSION_2003",

  // ... etc
}
```

**Code Ranges**:
- **1000-1099**: Viewer initialization
- **2000-2099**: Session management
- **3000-3099**: Text detection
- **4000-4099**: Text replacement
- **5000-5099**: Annotations
- **6000-6099**: Network
- **9000-9099**: Unknown/Generic

---

## Pattern Selection Guide

### Decision Tree

```
Is this a React component error?
├─ YES → Use Error Boundary
└─ NO ↓

Is this inside a custom hook?
├─ YES → Return error in state + throw AppError
└─ NO ↓

Is this a utility function?
├─ YES → Use createAppError() and throw
└─ NO ↓

Is this for displaying errors to user?
└─ YES → Use getUserFriendlyMessage()
```

### Pattern Matrix

| Context | Pattern | Example |
|---------|---------|---------|
| **React Component** | Error Boundary | Wrap tree with `<ErrorBoundary>` |
| **Custom Hook** | State + Throw | `const [error, setError] = useState()` |
| **Utility Function** | Throw AppError | `throw createAppError(...)` |
| **User Display** | Friendly Message | `getUserFriendlyMessage(error)` |
| **API Call** | Try-Catch + Wrap | Catch and wrap with context |

---

## Implementation Patterns

### Pattern 1: Custom Hooks (Recommended)

**Use When**: Implementing custom React hooks that perform async operations

**Implementation**:

```typescript
import { useState, useCallback } from "react";
import { createAppError, ErrorType } from "@/lib/utils/errorHandler";

export function useMyOperation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performOperation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Perform operation
      const result = await someAsyncOperation();
      return result;
    } catch (err) {
      // Create typed error with context
      const appError = createAppError(
        ErrorType.MY_OPERATION_TYPE,
        err,
        { operation: 'performOperation', /* additional context */ }
      );

      // Store user-friendly message in state
      setError(appError.message);

      // Re-throw for caller to handle if needed
      throw appError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    performOperation,
    isLoading,
    error,
    clearError,
  };
}
```

**Consumer Example**:

```tsx
function MyComponent() {
  const { performOperation, isLoading, error, clearError } = useMyOperation();

  const handleClick = async () => {
    try {
      await performOperation();
      // Success - show success message
    } catch (error) {
      // Error is already in state, optionally handle specially
    }
  };

  return (
    <>
      <button onClick={handleClick} disabled={isLoading}>
        {isLoading ? "Loading..." : "Perform Operation"}
      </button>
      {error && <ErrorMessage message={error} onDismiss={clearError} />}
    </>
  );
}
```

**Benefits**:
- ✅ Consumer has full control over error display
- ✅ Loading and error states managed together
- ✅ Composable and testable
- ✅ Follows React patterns

---

### Pattern 2: Error Boundaries (React Errors)

**Use When**: Catching React rendering errors, component lifecycle errors

**Implementation**:

```tsx
// Already implemented in lib/components/ErrorBoundary.tsx
import { ErrorBoundary } from "@/lib/components/ErrorBoundary";

// Wrap component tree
<ErrorBoundary>
  <MyComponent />
</ErrorBoundary>

// Or provide custom fallback
<ErrorBoundary fallback={<MyCustomErrorUI />}>
  <MyComponent />
</ErrorBoundary>
```

**When to Use**:
- ✅ Wrap route-level components
- ✅ Wrap complex component trees
- ✅ Catch unexpected React errors
- ❌ Don't use for async data fetching errors (use hooks instead)

---

### Pattern 3: Utility Functions

**Use When**: Creating utility functions that can fail

**Implementation**:

```typescript
import { createAppError, ErrorType, ErrorCode } from "@/lib/utils/errorHandler";

export function processData(data: unknown) {
  try {
    // Validate input
    if (!isValid(data)) {
      throw createAppError(
        ErrorType.VALIDATION,
        new Error("Invalid data format"),
        { data },
        ErrorCode.ERR_VALIDATION_FAILED
      );
    }

    // Process data
    return transformData(data);
  } catch (error) {
    // Wrap unknown errors
    if (!(error instanceof AppError)) {
      throw createAppError(
        ErrorType.UNKNOWN,
        error,
        { operation: 'processData' }
      );
    }
    throw error;
  }
}
```

---

### Pattern 4: Async Operations with Retry

**Use When**: Network requests or operations that should be retried

**Implementation**:

```typescript
import { retryWithBackoff } from "@/lib/utils/errorHandler";

async function fetchData(signal?: AbortSignal) {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Fetch failed');
      return response.json();
    },
    3,        // maxAttempts
    1000,     // delayMs
    signal    // Optional abort signal
  );
}

// With abort support
const controller = new AbortController();
try {
  const data = await fetchData(controller.signal);
} catch (error) {
  // Handle error or abort
}

// Cancel operation
controller.abort();
```

---

## Error Display Guidelines

### User-Facing Messages

**✅ DO**:
```typescript
"Failed to detect text in document. Please ensure the PDF contains selectable text."
"Unable to save changes. Please try again."
"Connection lost. Please check your internet connection."
```

**❌ DON'T**:
```typescript
"Error: TypeError: Cannot read property 'map' of undefined"
"Session.commit() rejected with code 500"
"Uncaught exception in line 142"
```

### Error Message Components

```tsx
// Success message
<div className={styles.success}>
  ✓ Successfully replaced 10 instances
</div>

// Error message
<div className={styles.error}>
  ⚠ Failed to replace text. Please try again.
  <button onClick={retry}>Retry</button>
</div>

// Warning message
<div className={styles.warning}>
  ⚡ Operation is taking longer than expected...
</div>
```

---

## Testing Error Scenarios

### Unit Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useMyOperation } from './useMyOperation';

describe('useMyOperation', () => {
  it('should handle errors gracefully', async () => {
    const { result } = renderHook(() => useMyOperation());

    // Trigger error
    await expect(result.current.performOperation()).rejects.toThrow();

    // Verify error state
    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should clear errors', async () => {
    const { result } = renderHook(() => useMyOperation());

    // Set error
    await expect(result.current.performOperation()).rejects.toThrow();

    // Clear error
    result.current.clearError();

    expect(result.current.error).toBeNull();
  });
});
```

### Integration Tests

```typescript
it('should display error message when operation fails', async () => {
  const { user } = render(<MyComponent />);

  // Mock operation to fail
  mockOperation.mockRejectedValue(new Error('Operation failed'));

  // Trigger operation
  await user.click(screen.getByRole('button', { name: /perform/i }));

  // Verify error display
  expect(screen.getByText(/failed to/i)).toBeInTheDocument();
});
```

---

## Common Pitfalls

### ❌ Pitfall 1: Swallowing Errors

```typescript
// BAD: Error is caught but not handled
try {
  await operation();
} catch (error) {
  // Silently ignored - user has no feedback!
}
```

**✅ Fix**:
```typescript
try {
  await operation();
} catch (error) {
  setError(getUserFriendlyMessage(error));
  logError(error, { operation: 'myOperation' });
}
```

---

### ❌ Pitfall 2: Exposing Technical Details

```typescript
// BAD: Shows technical error to user
<div>Error: {error.stack}</div>
```

**✅ Fix**:
```typescript
<div>{getUserFriendlyMessage(error)}</div>
{process.env.NODE_ENV === 'development' && (
  <details>
    <summary>Technical Details</summary>
    <pre>{error.stack}</pre>
  </details>
)}
```

---

### ❌ Pitfall 3: Not Providing Context

```typescript
// BAD: Generic error with no context
throw new Error("Operation failed");
```

**✅ Fix**:
```typescript
throw createAppError(
  ErrorType.SESSION_MANAGEMENT,
  new Error("Session commit failed"),
  { sessionId, pageCount, attemptNumber }
);
```

---

### ❌ Pitfall 4: Multiple Error Handling Patterns

```typescript
// BAD: Inconsistent patterns in same codebase
function a() { throw new Error(); }           // Pattern 1
function b() { return { error: "..." }; }     // Pattern 2
function c() { console.error(); return null; } // Pattern 3
```

**✅ Fix**: Pick ONE pattern per layer (see Pattern Selection Guide)

---

## Quick Reference

### Import Statements

```typescript
// Error creation and handling
import {
  createAppError,
  ErrorType,
  ErrorCode,
  getUserFriendlyMessage,
  logError,
  retryWithBackoff
} from "@/lib/utils/errorHandler";

// Error boundary component
import { ErrorBoundary } from "@/lib/components/ErrorBoundary";

// Performance monitoring (often used with error handling)
import { measurePerformance } from "@/lib/utils/performanceMonitor";
```

### Code Snippets

**Create Error**:
```typescript
createAppError(ErrorType.TEXT_DETECTION, error, { context }, ErrorCode.ERR_TEXT_3000)
```

**Display Error**:
```typescript
{error && <div className={styles.error}>{error}</div>}
```

**Clear Error**:
```typescript
const clearError = useCallback(() => setError(null), []);
```

**Retry with Backoff**:
```typescript
await retryWithBackoff(() => operation(), 3, 1000, signal);
```

---

## Summary

### Three Rules of Error Handling

1. **Categorize**: Use `ErrorType` enum for all errors
2. **Context**: Always include relevant context
3. **User-First**: Show friendly messages, log technical details

### Pattern Checklist

- [ ] Does my hook return `error` state?
- [ ] Does my hook throw `AppError` for caller handling?
- [ ] Do I use `createAppError()` with proper context?
- [ ] Are user-facing messages friendly and actionable?
- [ ] Are errors logged with `logError()` for monitoring?
- [ ] Do I handle loading states (`isLoading`)?
- [ ] Can users recover from this error?

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md) - Implementation details
- [CODE_REVIEW.md](./CODE_REVIEW.md) - Code quality assessment

---

**Questions?** Refer to existing implementations:
- `lib/hooks/useTextBlocks.ts` - Complete hook pattern
- `lib/hooks/useViewerSession.ts` - Session management errors
- `lib/components/ErrorBoundary.tsx` - React error boundary
- `lib/utils/errorHandler.ts` - Error infrastructure
