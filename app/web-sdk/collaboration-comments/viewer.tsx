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
    const commentAvatarRenderer = ({ comment }: any) => {
      const name = comment?.name ?? "?";
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
      toolbarItems: [
        ...(NutrientViewer.defaultToolbarItems ?? []).filter(
          (item: { type: string }) =>
            ["pager", "pan", "zoom-out", "zoom-in", "zoom-mode", "spacer"].includes(item.type),
        ),
        { type: "comment" },
      ],
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

        for (const comment of allComments as unknown as any[]) {
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
        for (let page = 0; page < instance.totalPageCount; page++) {
          const pageAnnotations = await instance.getAnnotations(page);
          for (const ann of pageAnnotations as unknown as any[]) {
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
