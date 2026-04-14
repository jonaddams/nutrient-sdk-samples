"use client";

import type { Instance } from "@nutrient-sdk/viewer";
import { useCallback, useEffect, useRef } from "react";

const DOCUMENT = "/documents/macaques.pdf";

export interface OutlineNode {
  title: string;
  pageIndex: number | null;
  children: OutlineNode[];
}

export interface BookmarkNode {
  id: string;
  name: string;
  pageIndex: number | null;
}

interface BookmarkNavigationViewerProps {
  onOutline: (nodes: OutlineNode[]) => void;
  onBookmarks: (nodes: BookmarkNode[]) => void;
  onCurrentPage: (page: number) => void;
  onTotalPages: (count: number) => void;
}

export default function BookmarkNavigationViewer({
  onOutline,
  onBookmarks,
  onCurrentPage,
  onTotalPages,
}: BookmarkNavigationViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<Instance | null>(null);

  // Stable refs to avoid re-mounting the viewer
  const onOutlineRef = useRef(onOutline);
  onOutlineRef.current = onOutline;
  const onBookmarksRef = useRef(onBookmarks);
  onBookmarksRef.current = onBookmarks;
  const onTotalPagesRef = useRef(onTotalPages);
  onTotalPagesRef.current = onTotalPages;

  const extractOutline = useCallback(async (inst: Instance) => {
    const { NutrientViewer } = window;
    if (!NutrientViewer) return;

    try {
      const outline = await inst.getDocumentOutline();
      const nodes = parseOutlineElements(outline.toArray(), NutrientViewer);
      onOutlineRef.current(nodes);
    } catch {
      onOutlineRef.current([]);
    }
  }, []);

  const extractBookmarks = useCallback(async (inst: Instance) => {
    const { NutrientViewer } = window;
    if (!NutrientViewer) return;

    try {
      const bookmarks = await inst.getBookmarks();
      const nodes: BookmarkNode[] = bookmarks.toArray().map((b: any) => ({
        id: b.id,
        name: b.name || "Untitled Bookmark",
        pageIndex: extractPageIndex(b.action, NutrientViewer),
      }));
      onBookmarksRef.current(nodes);
    } catch {
      onBookmarksRef.current([]);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !window.NutrientViewer) return;

    const { NutrientViewer } = window;

    NutrientViewer.load({
      container,
      document: DOCUMENT,
      useCDN: true,
      pageRendering: "next",
      licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
      toolbarItems: (NutrientViewer.defaultToolbarItems ?? []).filter(
        (item: { type: string }) =>
          ["pager", "zoom-out", "zoom-in", "zoom-mode", "search"].includes(
            item.type,
          ),
      ),
    }).then(async (instance: Instance) => {
      instanceRef.current = instance;
      (window as any).__bookmarkNavInstance = instance;
      onTotalPagesRef.current(instance.totalPageCount);

      instance.addEventListener(
        "viewState.currentPageIndex.change",
        (pageIndex: unknown) => {
          if (typeof pageIndex === "number") onCurrentPage(pageIndex);
        },
      );

      await extractOutline(instance);
      await extractBookmarks(instance);
    });

    return () => {
      instanceRef.current = null;
      NutrientViewer.unload(container);
    };
  }, [onCurrentPage, extractOutline, extractBookmarks]);

  return <div ref={containerRef} style={{ height: "100%" }} />;
}

function extractPageIndex(action: any, NutrientViewer: any): number | null {
  if (action instanceof NutrientViewer.Actions.GoToAction) {
    return action.pageIndex ?? null;
  }
  return null;
}

function parseOutlineElements(
  elements: any[],
  NutrientViewer: any,
): OutlineNode[] {
  return elements.map((el) => ({
    title: el.title || "Untitled",
    pageIndex: extractPageIndex(el.action, NutrientViewer),
    children: el.children
      ? parseOutlineElements(el.children.toArray(), NutrientViewer)
      : [],
  }));
}
