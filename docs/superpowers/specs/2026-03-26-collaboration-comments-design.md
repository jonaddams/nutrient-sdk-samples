# Collaboration Comments — Threaded Comment Replies with Author Tracking

**Date:** 2026-03-26
**Category:** Web SDK Sample — Annotations
**Status:** Design Approved

## Overview

A Web SDK sample demonstrating the Nutrient Comments API with threaded replies, author tracking, @mentions, and configurable display modes. Users switch between preset authors to simulate multi-user collaboration on a service agreement PDF.

## Architecture

**Approach:** SDK-Native — the Nutrient SDK's built-in comment system is the single source of truth. No external state management, no localStorage. Everything resets on page reload.

## File Structure

```
app/web-sdk/collaboration-comments/
├── page.tsx       — Layout, sidebar state, author switching, display mode toggle, thread list
├── viewer.tsx     — SDK init, event listeners, exposes instance methods via refs
└── styles.css     — Sidebar sections, author avatars, thread cards, display mode buttons
```

Registered in `app/web-sdk/page.tsx` under the **Annotations** category as "Collaboration Comments".

## Document

`/documents/service-agreement.pdf` — a contract is a natural fit for collaborative commenting.

## Sidebar Layout (280px)

Four sections, top to bottom:

### 1. Author Switcher

- Three preset author avatars as colored circles with initials (click to switch)
- Active author highlighted with a border
- Displays active author's name and email below the avatars
- Text input for custom author name (creates a fourth ephemeral author with neutral `#888` color)

### 2. Display Mode Toggle

- Segmented button: **Fitting** | **Floating** | **Popover**
- Default: Fitting
- Updates `viewState.commentDisplay` on the SDK instance

### 3. Toolbar Hint

- Small text: "Use the comment tool (💬) in the toolbar to add comments"
- No custom "Add Comment" button — users use the SDK's native toolbar comment button

### 4. Comment Threads

- Scrollable list of all comment threads
- Each thread card shows:
  - Author avatar (colored circle with initial) + name
  - Relative timestamp
  - Comment text preview (truncated)
  - Reply count (e.g., "💬 2 replies")
  - Left border colored to match the author
- Clicking a thread navigates to the comment's location in the document via `jumpToRect`

## Preset Authors

| Author | Color | Email | Role |
|--------|-------|-------|------|
| Alice Johnson | `#4a90d9` (blue) | alice@example.com | Default active author |
| Bob Smith | `#d94a7b` (pink) | bob@example.com | Secondary |
| Charlie Lee | `#4ad97b` (green) | charlie@example.com | Tertiary |

Custom name input creates a fourth author with `#888` (gray) color.

## Data Flow & SDK Integration

### Initialization

```
NutrientViewer.load({
  container,
  document: "/documents/service-agreement.pdf",
  useCDN: true,
  licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
  theme: NutrientViewer.Theme.DARK,
  mentionableUsers: [alice, bob, charlie],
  initialViewState: new NutrientViewer.ViewState({
    commentDisplay: NutrientViewer.CommentDisplay.FITTING
  })
})
```

### Author Switching

- When user selects a different author in the sidebar, update `setOnCommentCreationStart` to stamp `creatorName` on new comments:
  ```
  instance.setOnCommentCreationStart((comment) => {
    return comment.set("creatorName", activeAuthor.name);
  });
  ```
- Update `setMentionableUsers` to exclude the active author (you don't @mention yourself)

### Display Mode Toggle

- Update viewState with the selected `CommentDisplay` enum value
- SDK handles the re-rendering automatically

### Comment Thread List

- Listen to `comments.create`, `comments.update`, `comments.delete` events
- On any event, call `instance.getComments()` to get all comments
- Group comments by `rootId` to build thread structures
- Count replies per thread (comments sharing the same `rootId` beyond the first)
- Sort threads by most recent activity

### Thread Navigation

- Clicking a thread card in the sidebar calls `jumpToRect(pageIndex, boundingBox)` on the corresponding `CommentMarkerAnnotation`
- Requires looking up the marker annotation by the thread's `rootId`

### Custom Avatars

- Use `customRenderers.CommentAvatar` to render colored initial circles matching each author's assigned color
- Match author by `creatorName` to the preset authors list
- Unknown authors (custom names) get the neutral gray avatar

### Mentions

- All preset authors are registered as `mentionableUsers` with `id`, `name`, `displayName`, `description` (email)
- SDK provides the `@mention` autocomplete UI in the comment editor
- Active author is excluded from the mentionable list (can't mention yourself)

## Viewer Configuration

- **Theme:** Dark (`NutrientViewer.Theme.DARK`)
- **Toolbar:** Default toolbar with comment tools visible (no filtering needed)
- **Page rendering:** `"next"` (standard for samples)

## What This Sample Teaches

1. Creating and managing comments with the Nutrient Comments API
2. Threading comments with `rootId`-based grouping
3. Switching between comment display modes (Fitting, Floating, Popover)
4. Author tracking with `creatorName` and `setOnCommentCreationStart`
5. @mentions with `mentionableUsers` and `setMentionableUsers`
6. Custom avatar rendering with `customRenderers.CommentAvatar`
7. Reacting to comment events (`comments.create`, `comments.update`, `comments.delete`)
8. Navigating to comments programmatically with `jumpToRect`
