# Architecture Guide

## Overview

This document describes the architecture of the Content Edit API showcase application, which demonstrates Nutrient SDK's PDF text editing capabilities using Next.js and React.

## Technology Stack

- **Framework**: Next.js 16.1.1 with App Router
- **React**: 19.x with modern hooks
- **TypeScript**: 5.9.3 with strict type checking
- **PDF SDK**: Nutrient Web SDK 1.10.0
- **Testing**: Vitest + @testing-library/react
- **Build Tool**: Turbopack

## Project Structure

```
app/web-sdk/content-edit-api/
├── components/          # UI components
│   ├── FindReplaceDialog.tsx
│   ├── StatsPopup.tsx
│   └── __tests__/      # Component tests
├── viewer.tsx          # Main viewer component (731 lines)
└── page.tsx           # Route page component

lib/
├── hooks/             # Custom React hooks
│   ├── useSyncRef.ts
│   ├── useTextBlocks.ts
│   ├── useViewerSession.ts
│   └── __tests__/     # Hook tests
├── utils/             # Utility functions
│   ├── typeGuards.ts
│   └── __tests__/     # Utility tests
├── context/           # React contexts
│   └── ViewerContext.tsx
├── events/            # Event system
│   └── viewerEvents.ts
├── types/             # TypeScript types
│   └── nutrient.ts
└── constants.ts       # App constants

tests/
└── setup.ts          # Test configuration
```

## Core Concepts

### 1. Error Handling Architecture

The application implements a comprehensive three-layer error handling system for consistent error management across all components.

#### Three-Layer System

```
┌─────────────────────────────────────┐
│   User Interface (Components)       │  ← Display user-friendly messages
├─────────────────────────────────────┤
│   Business Logic (Hooks/Utils)      │  ← Throw typed errors with context
├─────────────────────────────────────┤
│   Error Infrastructure (Handlers)   │  ← Centralized logging & formatting
└─────────────────────────────────────┘
```

**Layer 1 - User Interface**: Components display friendly error messages to users
**Layer 2 - Business Logic**: Hooks and utilities throw typed `AppError` instances with context
**Layer 3 - Infrastructure**: Centralized error handler categorizes and formats errors

#### Error Types

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

#### Error Codes

For programmatic error handling, errors include hierarchical error codes:

- **1000-1099**: Viewer initialization errors
- **2000-2099**: Session management errors
- **3000-3099**: Text detection errors
- **4000-4099**: Text replacement errors
- **5000-5099**: Annotation errors
- **6000-6099**: Network errors
- **9000-9099**: Unknown/Generic errors

```typescript
try {
  await operation();
} catch (error) {
  if (error.code === ErrorCode.ERR_SESSION_IN_PROGRESS) {
    // Handle specific error scenario
  }
}
```

#### AppError Class

Custom error class that extends Error with additional context:

```typescript
class AppError extends Error {
  type: ErrorType;
  context?: Record<string, unknown>;
  code?: string;
  originalError?: unknown;
}
```

#### Error Handling Patterns

**Pattern 1: Custom Hooks (Recommended)**

Hooks return error state and throw typed errors:

```typescript
export function useMyOperation() {
  const [error, setError] = useState<string | null>(null);

  const performOperation = useCallback(async () => {
    try {
      // operation
    } catch (err) {
      const appError = createAppError(ErrorType.MY_TYPE, err, { context });
      setError(appError.message); // User-friendly message
      throw appError; // Re-throw for caller
    }
  }, []);

  return { performOperation, error, clearError };
}
```

**Pattern 2: Error Boundaries**

Global error boundary in [app/layout.tsx](../app/layout.tsx) catches React errors:

```tsx
<ErrorBoundary>
  {children}
</ErrorBoundary>
```

**Pattern 3: Utility Functions**

Utility functions throw typed errors with context:

```typescript
export function processData(data: unknown) {
  if (!isValid(data)) {
    throw createAppError(
      ErrorType.VALIDATION,
      new Error("Invalid data"),
      { data }
    );
  }
}
```

#### Error Display

Components display errors using state from hooks:

```tsx
{error && (
  <div className={styles.error}>
    {error}
    <button onClick={clearError}>Dismiss</button>
  </div>
)}
```

**Security**: Stack traces are hidden in production builds:

```tsx
{error && process.env.NODE_ENV === "development" && (
  <details>
    <summary>Technical Details</summary>
    <pre>{error.stack}</pre>
  </details>
)}
```

#### Error Recovery

Retry mechanism with exponential backoff for recoverable errors:

```typescript
await retryWithBackoff(
  async () => operation(),
  3,        // maxAttempts
  1000,     // delayMs
  signal    // AbortSignal for cancellation
);
```

#### Performance Monitoring

All critical operations include performance monitoring with configurable thresholds:

```typescript
const { result, duration } = await measurePerformance(
  'detectTextBlocks',
  async () => { /* operation */ },
  { metadata },
  { warning: 2000, error: 10000 }
);
```

Warnings and errors are logged for operations exceeding thresholds:
- **Warning**: Operation took longer than expected
- **Error**: Operation critically slow, may impact UX

See [ERROR_HANDLING_GUIDE.md](./ERROR_HANDLING_GUIDE.md) for comprehensive error handling patterns and best practices.

### 2. Component Architecture

The application follows a component-based architecture with clear separation of concerns:

#### Main Viewer Component (`viewer.tsx`)
- **Responsibility**: Orchestrates PDF viewing and text editing operations
- **Size**: 731 lines (reduced from 940 lines via component extraction)
- **Key Features**:
  - PDF document loading and rendering
  - Text block detection and visualization
  - Find & replace operations
  - Session management
  - State coordination

#### Extracted UI Components

**FindReplaceDialog** (`components/FindReplaceDialog.tsx`)
- **Responsibility**: Text find and replace interface
- **Props**: 9 controlled props for complete parent control
- **Features**: Auto-focus, validation, processing states, result display

**StatsPopup** (`components/StatsPopup.tsx`)
- **Responsibility**: Success message display
- **Props**: 3 simple props for visibility, message, and close handler
- **Features**: Centered overlay, success styling, checkmark icon

### 2. Custom Hooks

The application uses three main custom hooks to manage different aspects of functionality:

#### `useSyncRef<T>`
- **Purpose**: Keep a ref synchronized with a state value
- **Use Case**: Access current state in stable callbacks without re-renders
- **Pattern**: Combines `useRef` + `useEffect` for automatic sync
- **Location**: `lib/hooks/useSyncRef.ts`

```tsx
const countRef = useSyncRef(count);
// countRef.current always has latest count, no deps needed in callbacks
```

#### `useTextBlocks`
- **Purpose**: Manage text blocks state and operations
- **Features**:
  - Text block detection across all pages
  - Block selection management
  - Find and replace logic
  - Loading states
- **Location**: `lib/hooks/useTextBlocks.ts`

```tsx
const {
  textBlocks,
  selectedBlocks,
  detectTextBlocks,
  findAndReplace
} = useTextBlocks();
```

#### `useViewerSession`
- **Purpose**: Manage Nutrient content editing session lifecycle
- **Features**:
  - Session creation with cleanup
  - Commit changes to document
  - Discard changes safely
  - Active session tracking
- **Location**: `lib/hooks/useViewerSession.ts`

```tsx
const {
  beginSession,
  commitSession,
  discardSession
} = useViewerSession();
```

### 3. Type Safety

The application uses TypeScript extensively for type safety:

#### Type Guards (`lib/utils/typeGuards.ts`)
- `extractAnnotationId()`: Safely extract IDs from SDK responses
- `toAnnotation()`: Convert unknown SDK objects to typed Annotations
- `isAnnotation()`: TypeScript type guard for runtime validation

#### Nutrient Types (`lib/types/nutrient.ts`)
- Defines TypeScript interfaces for SDK types
- Provides type safety for SDK interactions
- Documents expected shape of SDK objects

### 4. Context System

#### ViewerContext (`lib/context/ViewerContext.tsx`)
- **Purpose**: Share Nutrient instance across components
- **Provider**: Wraps components that need SDK access
- **Consumer**: `useViewer()` hook for accessing instance

### 5. Event System

#### Typed Event System (`lib/events/viewerEvents.ts`)
- **Purpose**: Type-safe inter-component communication
- **Events**:
  - `EDITING_STATE_CHANGE`: Tracks editing mode
  - `SELECTED_BLOCKS_CHANGE`: Tracks selection count
  - `CONTENT_EDITING_STATE_CHANGE`: Tracks content editing state
- **API**:
  - `dispatchViewerEvent()`: Dispatch typed events
  - `dispatchViewerEventDeferred()`: Dispatch with delay
  - `addViewerEventListener()`: Add typed listener

```tsx
// Dispatch event
dispatchViewerEvent('EDITING_STATE_CHANGE', { isEditing: true });

// Listen to event
const cleanup = addViewerEventListener('EDITING_STATE_CHANGE', (detail) => {
  console.log('Editing:', detail.isEditing);
});
```

## Data Flow

### Text Detection Flow

```
User clicks "Detect Text"
  ↓
useViewerSession.beginSession()
  ↓
useTextBlocks.detectTextBlocks()
  ↓
Iterate through all pages
  ↓
session.getTextBlocks(pageIndex)
  ↓
Store with page indices
  ↓
Render annotations on PDF
```

### Find & Replace Flow

```
User enters find/replace text
  ↓
Controlled state updates (findText, replaceText)
  ↓
User clicks "Replace All"
  ↓
useTextBlocks.findAndReplace()
  ↓
Generate update operations
  ↓
session.updateTextBlocks(updates)
  ↓
useViewerSession.commitSession()
  ↓
Show success popup with count
```

### Session Lifecycle

```
Begin Session
  ↓
Create ContentEditingSession
  ↓
Detect or modify text blocks
  ↓
[User has choice]
  ↓
├─ Commit → Save changes to PDF
└─ Discard → Cancel changes
```

## State Management

The application uses React's built-in state management:

### Component State
- UI state (dialogs, popups, inputs)
- Loading states (isDetecting, isProcessing)
- Operation results (replacementResult, statsMessage)

### Hook State
- Text blocks (all detected blocks)
- Selected blocks (user selections)
- Active session (current editing session)

### Ref State
- Viewer instance (persistent SDK instance)
- Session reference (current session)
- Input refs (for focus management)

## Testing Strategy

### Unit Tests
- **Hooks**: Test state changes, callbacks, edge cases
- **Utilities**: Test type guards, validation, edge cases
- **Components**: Test rendering, interactions, props

### Test Setup
- Vitest with happy-dom environment
- @testing-library/react for component testing
- Mock window.matchMedia for compatibility
- Automatic cleanup after each test

### Coverage
- 57 tests across 4 test files
- Comprehensive coverage of hooks and utilities
- Component interaction testing
- Edge case validation

## Performance Considerations

### Optimization Techniques

1. **useSyncRef Pattern**
   - Avoid re-creating callbacks
   - Access latest state without deps
   - Stable callback references

2. **Memoization**
   - `useCallback` for stable function references
   - Prevents unnecessary re-renders
   - Optimizes child component updates

3. **Lazy Rendering**
   - Components return `null` when not visible
   - Conditional rendering for dialogs/popups
   - Reduces DOM nodes

4. **Batched Updates**
   - Find/replace processes all blocks at once
   - Single commit for all changes
   - Efficient SDK API usage

## Best Practices

### Component Design
- ✅ Single Responsibility Principle
- ✅ Props-based APIs for reusability
- ✅ Controlled components for predictability
- ✅ Proper TypeScript typing
- ✅ Comprehensive JSDoc documentation

### Hook Design
- ✅ Encapsulate related logic
- ✅ Return consistent object shapes
- ✅ Include loading/error states
- ✅ Provide cleanup functions
- ✅ Use stable callback references

### Code Organization
- ✅ Colocated tests with source files
- ✅ Clear file naming conventions
- ✅ Logical directory structure
- ✅ Separation of concerns
- ✅ Type definitions separate from logic

## Completed Improvements

### Phase 1: Critical Issues ✅
- ✅ Centralized error handler with ErrorType and ErrorCode enums
- ✅ Race condition prevention in session management
- ✅ Focus trap and escape key handling for dialogs
- ✅ Performance monitoring infrastructure
- ✅ Security hardening (stack traces hidden in production)
- ✅ Global error boundary integration
- ✅ State mutation fixes

### Phase 2: HIGH Priority Quick Wins ✅
- ✅ Enhanced type guard validation
- ✅ useViewerEvent hook implementation
- ✅ Auto-dismiss for success messages
- ✅ Error detection improvements
- ✅ Abort signal support for cancellable operations

### Phase 3: Design System & Accessibility ✅
- ✅ CSS variables design token system (56+ tokens)
- ✅ Automatic dark mode support
- ✅ Reduced motion accessibility compliance
- ✅ CSS modules for all components
- ✅ WCAG 2.1 compliant

### Phase 4: Documentation ✅
- ✅ Error handling guide with patterns and examples
- ✅ Architecture documentation for error handling
- ✅ Implementation summary with metrics
- ✅ Migration guides for all changes

### Phase 5: Loading States & Documentation ✅
- ✅ Loading states for all async operations (isCreatingSession, isCommitting, isDiscarding)
- ✅ Error handling documentation in ARCHITECTURE.md
- ✅ Comprehensive ERROR_HANDLING_GUIDE.md created

### Phase 6: Final Quality Improvements ✅
- ✅ Aria-label redundancy fixes
- ✅ CSS module test assertions (12 new tests)
- ✅ Error scenario tests (6 new tests)

## Future Improvements

### Remaining HIGH Priority
- Integration tests for critical user flows (requires complex SDK mocking)

### Potential Enhancements
- Virtual scrolling for large documents
- Undo/redo functionality
- Search result highlighting
- Batch operations on selections
- Export functionality
- Advanced text editing features

## SDK Integration

### Nutrient SDK Usage

The application integrates with Nutrient Web SDK for PDF operations:

1. **Instance Management**
   - Load and render PDF documents
   - Access SDK API through instance
   - Maintain instance in ViewerContext

2. **Content Editing Session**
   - Begin session for text operations
   - Get text blocks from pages
   - Update text blocks
   - Commit or discard changes

3. **Annotation System**
   - Create highlight annotations
   - Track annotation IDs
   - Update/remove annotations
   - Visual feedback for selections

## Debugging Tips

### Common Issues

1. **Session Already Active**
   - Ensure `discardSession()` before new session
   - Check `hasActiveSession()` before operations

2. **Text Blocks Not Detected**
   - Verify session is active
   - Check document has text content
   - Ensure page indices are correct

3. **Updates Not Applied**
   - Confirm `commitSession()` is called
   - Check for SDK errors in console
   - Verify update format matches SDK expectations

### Debugging Tools
- React DevTools for component state
- Console logs in hook operations
- Browser DevTools for SDK errors
- Test suite for regression testing

## Conclusion

This architecture provides a solid foundation for PDF text editing with:
- Clear separation of concerns
- Type-safe SDK integration
- Testable, maintainable code
- Component reusability
- Comprehensive documentation

For implementation details, see the source code with inline JSDoc comments.
