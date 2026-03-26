# Collaboration Comments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Web SDK sample demonstrating threaded comment replies with author tracking, @mentions, and configurable display modes using the Nutrient Comments API.

**Architecture:** SDK-Native approach — the Nutrient SDK's built-in comment system is the single source of truth. A sidebar provides author switching, display mode toggling, and a comment thread summary. The SDK toolbar handles comment creation; `setOnCommentCreationStart` stamps the active author's name on new comments.

**Tech Stack:** Next.js (App Router), React, Nutrient Web SDK (CDN), CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-26-collaboration-comments-design.md`

---

## File Structure

```
app/web-sdk/collaboration-comments/
├── page.tsx       — Layout, sidebar with author switcher, display mode toggle, thread list
├── viewer.tsx     — SDK initialization, event listeners, exposes methods via refs to page
└── styles.css     — All sidebar and component styling with dark mode support
```

Also modified:
- `app/web-sdk/page.tsx` — Add sample entry to the samples array

---

### Task 1: Create styles.css

**Files:**
- Create: `app/web-sdk/collaboration-comments/styles.css`

- [ ] **Step 1: Create the stylesheet**

```css
/* Collaboration Comments Styles */

.collab-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  gap: 0;
}

/* Sidebar */
.collab-sidebar {
  width: 280px;
  flex-shrink: 0;
  background-color: var(--warm-gray-100);
  border-right: 1px solid var(--warm-gray-400);
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

@media (prefers-color-scheme: dark) {
  .collab-sidebar {
    background-color: var(--warm-gray-950);
    border-right-color: var(--warm-gray-800);
  }
}

/* Section */
.collab-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.collab-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--black);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

@media (prefers-color-scheme: dark) {
  .collab-label {
    color: var(--warm-gray-400);
  }
}

/* Author Switcher */
.collab-authors {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.collab-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  color: white;
  cursor: pointer;
  transition: all 0.15s;
  border: 2px solid transparent;
  opacity: 0.5;
}

.collab-avatar:hover {
  opacity: 0.8;
}

.collab-avatar-active {
  opacity: 1;
  border-color: currentColor;
}

.collab-author-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--black);
}

.collab-author-email {
  font-size: 11px;
  color: var(--warm-gray-700);
}

@media (prefers-color-scheme: dark) {
  .collab-author-name {
    color: var(--warm-gray-200);
  }
  .collab-author-email {
    color: var(--warm-gray-500);
  }
}

.collab-custom-input {
  width: 100%;
  padding: 6px 10px;
  background: var(--white);
  border: 1px solid var(--warm-gray-300);
  border-radius: 6px;
  color: var(--black);
  font-size: 12px;
  margin-top: 8px;
  box-sizing: border-box;
}

.collab-custom-input::placeholder {
  color: var(--warm-gray-500);
}

@media (prefers-color-scheme: dark) {
  .collab-custom-input {
    background: var(--warm-gray-900);
    border-color: var(--warm-gray-700);
    color: var(--warm-gray-200);
  }
}

/* Display Mode Toggle */
.collab-display-modes {
  display: flex;
  gap: 4px;
}

.collab-display-btn {
  flex: 1;
  padding: 6px;
  text-align: center;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid var(--warm-gray-300);
  background: var(--white);
  color: var(--black);
  transition: all 0.15s;
}

.collab-display-btn:hover {
  border-color: var(--warm-gray-500);
}

.collab-display-btn-active {
  background: var(--digital-pollen);
  border-color: var(--digital-pollen);
  color: var(--black);
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .collab-display-btn {
    background: var(--warm-gray-900);
    border-color: var(--warm-gray-700);
    color: var(--warm-gray-300);
  }

  .collab-display-btn:hover {
    border-color: var(--warm-gray-500);
  }

  .collab-display-btn-active {
    background: var(--digital-pollen);
    color: var(--black);
  }
}

/* Toolbar Hint */
.collab-hint {
  font-size: 12px;
  color: var(--warm-gray-700);
  text-align: center;
  padding: 12px 8px;
  line-height: 1.5;
  background: var(--white);
  border: 1px solid var(--warm-gray-300);
  border-radius: 6px;
}

@media (prefers-color-scheme: dark) {
  .collab-hint {
    color: var(--warm-gray-500);
    background: var(--warm-gray-900);
    border-color: var(--warm-gray-700);
  }
}

/* Thread List */
.collab-threads {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.collab-thread-card {
  padding: 12px;
  background: var(--white);
  border: 1px solid var(--warm-gray-300);
  border-radius: 8px;
  border-left: 3px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.collab-thread-card:hover {
  border-color: var(--warm-gray-400);
}

@media (prefers-color-scheme: dark) {
  .collab-thread-card {
    background: var(--warm-gray-900);
    border-color: var(--warm-gray-700);
  }

  .collab-thread-card:hover {
    border-color: var(--warm-gray-500);
  }
}

.collab-thread-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.collab-thread-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.collab-thread-author {
  font-weight: 600;
  font-size: 12px;
  color: var(--black);
}

.collab-thread-time {
  font-size: 10px;
  color: var(--warm-gray-600);
  margin-left: auto;
}

@media (prefers-color-scheme: dark) {
  .collab-thread-author {
    color: var(--warm-gray-200);
  }
  .collab-thread-time {
    color: var(--warm-gray-600);
  }
}

.collab-thread-text {
  font-size: 12px;
  color: var(--warm-gray-800);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collab-thread-replies {
  font-size: 11px;
  color: var(--warm-gray-600);
}

@media (prefers-color-scheme: dark) {
  .collab-thread-text {
    color: var(--warm-gray-400);
  }
  .collab-thread-replies {
    color: var(--warm-gray-600);
  }
}

.collab-empty {
  font-size: 13px;
  color: var(--warm-gray-700);
  text-align: center;
  padding: 16px 8px;
  line-height: 1.5;
}

@media (prefers-color-scheme: dark) {
  .collab-empty {
    color: var(--warm-gray-500);
  }
}

/* Thread count badge */
.collab-count {
  background: var(--warm-gray-300);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  color: var(--warm-gray-800);
  margin-left: 4px;
}

@media (prefers-color-scheme: dark) {
  .collab-count {
    background: var(--warm-gray-800);
    color: var(--warm-gray-400);
  }
}

/* Viewer */
.collab-viewer-container {
  flex: 1;
  height: 100%;
  min-height: 600px;
}
```

- [ ] **Step 2: Commit**

```bash
git add app/web-sdk/collaboration-comments/styles.css
git commit -m "feat(collaboration-comments): add sidebar and component styles"
```

---

### Task 2: Create viewer.tsx

**Files:**
- Create: `app/web-sdk/collaboration-comments/viewer.tsx`

This is the core SDK integration component. It initializes the Nutrient viewer, manages comment events, and exposes methods to the parent via refs.

- [ ] **Step 1: Create viewer.tsx with types and constants**

```tsx
"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useEffect, useRef } from "react";

const DOCUMENT = "/documents/service-agreement.pdf";

export type Author = {
  id: string;
  name: string;
  email: string;
  color: string;
};

export const PRESET_AUTHORS: Author[] = [
  { id: "alice", name: "Alice Johnson", email: "alice@example.com", color: "#4a90d9" },
  { id: "bob", name: "Bob Smith", email: "bob@example.com", color: "#d94a7b" },
  { id: "charlie", name: "Charlie Lee", email: "charlie@example.com", color: "#4ad97b" },
];

export type CommentThread = {
  rootId: string;
  pageIndex: number;
  authorName: string;
  text: string;
  replyCount: number;
  createdAt: Date;
};

type CollaborationViewerProps = {
  activeAuthor: Author;
  displayMode: string;
  onThreadsChanged: (threads: CommentThread[]) => void;
  navigateToThreadRef: React.MutableRefObject<((rootId: string) => void) | null>;
};
```

- [ ] **Step 2: Add the component body with SDK initialization**

Continue in the same file — add the component function with initialization logic:

```tsx
export default function CollaborationViewer({
  activeAuthor,
  displayMode,
  onThreadsChanged,
  navigateToThreadRef,
}: CollaborationViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);
  const activeAuthorRef = useRef(activeAuthor);
  const onThreadsChangedRef = useRef(onThreadsChanged);

  // Keep refs in sync with latest props
  activeAuthorRef.current = activeAuthor;
  onThreadsChangedRef.current = onThreadsChanged;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    // Build mentionable users from presets
    const mentionableUsers = PRESET_AUTHORS.map((a) => ({
      id: a.id,
      name: a.name,
      displayName: a.name,
      description: a.email,
    }));

    // Custom avatar renderer: colored initials matching author color
    const commentAvatarRenderer = (comment: any) => {
      const name = comment.creatorName ?? "?";
      const preset = PRESET_AUTHORS.find((a) => a.name === name);
      const color = preset?.color ?? "#888";
      const initial = name.charAt(0).toUpperCase();

      const el = document.createElement("div");
      el.style.cssText = `width:100%;height:100%;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:12px;`;
      el.textContent = initial;
      return { node: el, append: false };
    };

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      theme: NutrientViewer.Theme.DARK,
      pageRendering: "next",
      mentionableUsers,
      customRenderers: {
        CommentAvatar: commentAvatarRenderer,
      },
      initialViewState: new NutrientViewer.ViewState({
        commentDisplay: NutrientViewer.CommentDisplay.FITTING,
      }),
    }).then((instance: Instance) => {
      instanceRef.current = instance;

      // Stamp active author on new comments
      instance.setOnCommentCreationStart((comment: any) => {
        const author = activeAuthorRef.current;
        return comment.set("creatorName", author.name);
      });

      // Helper: refresh thread list from SDK state
      const refreshThreads = async () => {
        const allComments = await instance.getComments();
        const threadMap = new Map<string, CommentThread>();

        for (const comment of allComments as any[]) {
          const rootId = comment.rootId;
          if (!rootId) continue;

          if (!threadMap.has(rootId)) {
            threadMap.set(rootId, {
              rootId,
              pageIndex: comment.pageIndex ?? 0,
              authorName: comment.creatorName ?? "Unknown",
              text: comment.text?.value ?? "",
              replyCount: 0,
              createdAt: comment.createdAt ? new Date(comment.createdAt) : new Date(),
            });
          } else {
            const thread = threadMap.get(rootId)!;
            thread.replyCount += 1;
          }
        }

        const threads = Array.from(threadMap.values()).sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        onThreadsChangedRef.current(threads);
      };

      // Listen for comment changes
      instance.addEventListener("comments.create", refreshThreads);
      instance.addEventListener("comments.update", refreshThreads);
      instance.addEventListener("comments.delete", refreshThreads);

      // Navigate to a thread's marker annotation
      navigateToThreadRef.current = async (rootId: string) => {
        const annotations = await instance.getAnnotations(0);
        // Search all pages for the marker
        for (let page = 0; page < instance.totalPageCount; page++) {
          const pageAnnotations = await instance.getAnnotations(page);
          for (const ann of pageAnnotations as any[]) {
            if (ann.id?.toString() === rootId || ann.name === rootId) {
              instance.jumpToRect(page, ann.boundingBox);
              return;
            }
          }
        }
      };

      // Initial refresh
      refreshThreads();
    });

    return () => {
      navigateToThreadRef.current = null;
      if (container) {
        window.NutrientViewer?.unload(container);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update display mode when prop changes
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance || !window.NutrientViewer) return;

    const { NutrientViewer } = window;
    const modeMap: Record<string, any> = {
      FITTING: NutrientViewer.CommentDisplay.FITTING,
      FLOATING: NutrientViewer.CommentDisplay.FLOATING,
      POPOVER: NutrientViewer.CommentDisplay.POPOVER,
    };
    const mode = modeMap[displayMode];
    if (mode !== undefined) {
      instance.setViewState((vs: any) => vs.set("commentDisplay", mode));
    }
  }, [displayMode]);

  // Update mentionable users when active author changes (exclude self)
  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return;

    const others = PRESET_AUTHORS.filter((a) => a.id !== activeAuthor.id).map((a) => ({
      id: a.id,
      name: a.name,
      displayName: a.name,
      description: a.email,
    }));
    instance.setMentionableUsers(others);
  }, [activeAuthor]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
```

- [ ] **Step 3: Commit**

```bash
git add app/web-sdk/collaboration-comments/viewer.tsx
git commit -m "feat(collaboration-comments): add viewer with SDK comment integration"
```

---

### Task 3: Create page.tsx

**Files:**
- Create: `app/web-sdk/collaboration-comments/page.tsx`

The page component manages sidebar state and renders the viewer.

- [ ] **Step 1: Create page.tsx**

```tsx
"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import {
  PRESET_AUTHORS,
  type Author,
  type CommentThread,
} from "./viewer";
import "./styles.css";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

const DISPLAY_MODES = ["FITTING", "FLOATING", "POPOVER"] as const;

function getAuthorColor(authorName: string): string {
  const preset = PRESET_AUTHORS.find((a) => a.name === authorName);
  return preset?.color ?? "#888";
}

function getAuthorInitial(authorName: string): string {
  return authorName.charAt(0).toUpperCase();
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function CollaborationCommentsPage() {
  const [activeAuthor, setActiveAuthor] = useState<Author>(PRESET_AUTHORS[0]);
  const [displayMode, setDisplayMode] = useState<string>("FITTING");
  const [threads, setThreads] = useState<CommentThread[]>([]);
  const [customName, setCustomName] = useState("");
  const navigateToThreadRef = useRef<((rootId: string) => void) | null>(null);

  const handleThreadsChanged = useCallback((newThreads: CommentThread[]) => {
    setThreads(newThreads);
  }, []);

  const handleCustomNameSubmit = () => {
    const name = customName.trim();
    if (!name) return;
    setActiveAuthor({ id: "custom", name, email: "", color: "#888" });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Collaboration Comments"
        description="Switch between authors to add threaded comments with @mentions. Toggle display modes to compare Fitting, Floating, and Popover comment layouts. Use the comment tool in the toolbar to place comments on the document."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="collab-wrapper">
            {/* Sidebar */}
            <div className="collab-sidebar">
              {/* Author Switcher */}
              <div className="collab-section">
                <div className="collab-label">Active Author</div>
                <div className="collab-authors">
                  {PRESET_AUTHORS.map((author) => (
                    <button
                      key={author.id}
                      type="button"
                      className={`collab-avatar ${activeAuthor.id === author.id ? "collab-avatar-active" : ""}`}
                      style={{ backgroundColor: author.color, color: author.color }}
                      onClick={() => {
                        setActiveAuthor(author);
                        setCustomName("");
                      }}
                      title={author.name}
                    >
                      <span style={{ color: "white" }}>{author.name.charAt(0)}</span>
                    </button>
                  ))}
                </div>
                <div className="collab-author-name" style={{ color: activeAuthor.color }}>
                  {activeAuthor.name}
                </div>
                {activeAuthor.email && (
                  <div className="collab-author-email">{activeAuthor.email}</div>
                )}
                <input
                  type="text"
                  className="collab-custom-input"
                  placeholder="Or type a custom name..."
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCustomNameSubmit();
                  }}
                  onBlur={handleCustomNameSubmit}
                />
              </div>

              {/* Display Mode */}
              <div className="collab-section">
                <div className="collab-label">Display Mode</div>
                <div className="collab-display-modes">
                  {DISPLAY_MODES.map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      className={`collab-display-btn ${displayMode === mode ? "collab-display-btn-active" : ""}`}
                      onClick={() => setDisplayMode(mode)}
                    >
                      {mode.charAt(0) + mode.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toolbar Hint */}
              <div className="collab-hint">
                Use the <strong>comment tool</strong> in the toolbar to add comments to the document
              </div>

              {/* Comment Threads */}
              <div className="collab-section" style={{ flex: 1, minHeight: 0 }}>
                <div className="collab-label">
                  Comment Threads
                  <span className="collab-count">{threads.length}</span>
                </div>
                {threads.length === 0 ? (
                  <div className="collab-empty">
                    No comments yet. Use the comment tool in the toolbar to add one.
                  </div>
                ) : (
                  <div className="collab-threads">
                    {threads.map((thread) => (
                      <button
                        key={thread.rootId}
                        type="button"
                        className="collab-thread-card"
                        style={{ borderLeftColor: getAuthorColor(thread.authorName) }}
                        onClick={() => navigateToThreadRef.current?.(thread.rootId)}
                      >
                        <div className="collab-thread-header">
                          <div
                            className="collab-thread-avatar"
                            style={{ backgroundColor: getAuthorColor(thread.authorName) }}
                          >
                            {getAuthorInitial(thread.authorName)}
                          </div>
                          <span className="collab-thread-author">{thread.authorName}</span>
                          <span className="collab-thread-time">
                            {formatTimeAgo(thread.createdAt)}
                          </span>
                        </div>
                        <div className="collab-thread-text">{thread.text}</div>
                        {thread.replyCount > 0 && (
                          <div className="collab-thread-replies">
                            {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Viewer */}
            <section className="collab-viewer-container">
              <Viewer
                activeAuthor={activeAuthor}
                displayMode={displayMode}
                onThreadsChanged={handleThreadsChanged}
                navigateToThreadRef={navigateToThreadRef}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/web-sdk/collaboration-comments/page.tsx
git commit -m "feat(collaboration-comments): add page with sidebar and author switching"
```

---

### Task 4: Register sample in the catalog

**Files:**
- Modify: `app/web-sdk/page.tsx` (add entry to `samples` array)

- [ ] **Step 1: Add the sample entry**

In `app/web-sdk/page.tsx`, add this entry to the `samples` array (alphabetically, after "Brightness & Contrast" and before "Content Editing API"):

```typescript
  {
    name: "Collaboration Comments",
    category: "Annotations",
    description:
      "Threaded comment replies with author tracking, @mentions, and configurable display modes (Fitting, Floating, Popover)",
    path: "/web-sdk/collaboration-comments",
  },
```

- [ ] **Step 2: Commit**

```bash
git add app/web-sdk/page.tsx
git commit -m "feat(collaboration-comments): register sample in catalog"
```

---

### Task 5: Manual testing and fixes

No files to create — this is a verification task.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to the sample**

Open `http://localhost:3000/web-sdk/collaboration-comments` in a browser.

- [ ] **Step 3: Verify core functionality**

Test each feature:
1. **Author switching** — Click each avatar (Alice, Bob, Charlie). Verify the name and color update in the sidebar.
2. **Custom name** — Type a custom name and press Enter. Verify it becomes the active author.
3. **Display mode** — Toggle between Fitting, Floating, and Popover. Verify the comment display changes in the viewer.
4. **Add comment** — Click the comment tool in the SDK toolbar, place a comment on the document, type text. Verify the comment appears with the active author's name.
5. **Thread list** — After adding comments, verify the sidebar thread list updates with correct author, text preview, and timestamp.
6. **Replies** — Click a comment in the viewer, add a reply. Verify the reply count updates in the sidebar.
7. **Mentions** — In a comment, type `@` and verify the autocomplete shows the other two authors (not the active one).
8. **Thread navigation** — Click a thread card in the sidebar. Verify the viewer scrolls to that comment's location.

- [ ] **Step 4: Fix any issues found**

Address TypeScript errors, styling issues, or SDK API mismatches discovered during testing. Common things to watch for:
- `instance.getComments()` return type may need casting
- `comment.set()` method signature
- `CommentDisplay` enum access path
- `setViewState` callback signature
- `jumpToRect` parameters

- [ ] **Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix(collaboration-comments): address issues found during testing"
```

---

### Task 6: Build verification

- [ ] **Step 1: Run the production build**

```bash
npm run build
```

Expected: Build completes without TypeScript errors.

- [ ] **Step 2: Fix any build errors**

Common issues:
- `any` types that need explicit casting (use `as unknown as Type` pattern from other samples)
- Missing `eslint-disable` comments for exhaustive-deps
- Unused imports

- [ ] **Step 3: Commit if fixes were needed**

```bash
git add -A
git commit -m "fix(collaboration-comments): resolve build errors"
```
