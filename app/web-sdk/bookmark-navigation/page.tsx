"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import type { BookmarkNode, OutlineNode } from "./viewer";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

export default function BookmarkNavigationPage() {
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkNode[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [tab, setTab] = useState<"outline" | "bookmarks">("outline");
  const handleOutline = useCallback((nodes: OutlineNode[]) => {
    setOutline(nodes);
  }, []);

  const handleBookmarks = useCallback((nodes: BookmarkNode[]) => {
    setBookmarks(nodes);
  }, []);

  const handleCurrentPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleTotalPages = useCallback((count: number) => {
    setTotalPages(count);
  }, []);

  const goToPage = (pageIndex: number | null) => {
    if (pageIndex === null) return;
    const inst = (window as any).__bookmarkNavInstance;
    if (inst) {
      inst.setViewState((vs: any) => vs.set("currentPageIndex", pageIndex));
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Bookmark & Outline Navigation"
        description="Browse the document's table of contents (outline) and bookmarks in a custom sidebar. Click any entry to navigate directly to that page."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              {/* Tab toggle */}
              <div className="p-4 border-b border-[var(--warm-gray-400)]">
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1414] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setTab("outline")}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      tab === "outline"
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Outline ({outline.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("bookmarks")}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      tab === "bookmarks"
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Bookmarks ({bookmarks.length})
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Page {currentPage + 1} of {totalPages}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {tab === "outline" ? (
                  outline.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 dark:text-gray-500 text-center">
                      This document has no outline / table of contents.
                    </div>
                  ) : (
                    <div className="py-2">
                      {outline.map((node) => (
                        <OutlineItem
                          key={`${node.title}-p${node.pageIndex}`}
                          node={node}
                          depth={0}
                          currentPage={currentPage}
                          onNavigate={goToPage}
                        />
                      ))}
                    </div>
                  )
                ) : bookmarks.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 dark:text-gray-500 text-center">
                    This document has no bookmarks.
                  </div>
                ) : (
                  <div className="py-2">
                    {bookmarks.map((bm) => (
                      <button
                        key={bm.id}
                        type="button"
                        onClick={() => goToPage(bm.pageIndex)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1414] flex items-center justify-between ${
                          bm.pageIndex === currentPage
                            ? "bg-gray-50 dark:bg-[#1a1414] font-medium"
                            : ""
                        }`}
                      >
                        <span className="text-gray-800 dark:text-gray-200 truncate">
                          {bm.name}
                        </span>
                        {bm.pageIndex !== null && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums ml-2 flex-shrink-0">
                            p.{bm.pageIndex + 1}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Viewer */}
            <div className="flex-1 min-w-0">
              <Viewer
                onOutline={handleOutline}
                onBookmarks={handleBookmarks}
                onCurrentPage={handleCurrentPage}
                onTotalPages={handleTotalPages}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function OutlineItem({
  node,
  depth,
  currentPage,
  onNavigate,
}: {
  node: OutlineNode;
  depth: number;
  currentPage: number;
  onNavigate: (pageIndex: number | null) => void;
}) {
  const isActive = node.pageIndex === currentPage;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => onNavigate(node.pageIndex)}
        className={`w-full text-left py-2 pr-4 text-sm transition-colors cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1a1414] flex items-center justify-between ${
          isActive ? "bg-gray-50 dark:bg-[#1a1414] font-medium" : ""
        }`}
        style={{ paddingLeft: `${16 + depth * 16}px` }}
      >
        <span
          className={`truncate ${
            isActive
              ? "text-gray-900 dark:text-white"
              : "text-gray-700 dark:text-gray-300"
          }`}
        >
          {node.title}
        </span>
        {node.pageIndex !== null && (
          <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums ml-2 flex-shrink-0">
            p.{node.pageIndex + 1}
          </span>
        )}
      </button>
      {hasChildren &&
        node.children.map((child) => (
          <OutlineItem
            key={`${child.title}-p${child.pageIndex}`}
            node={child}
            depth={depth + 1}
            currentPage={currentPage}
            onNavigate={onNavigate}
          />
        ))}
    </div>
  );
}
