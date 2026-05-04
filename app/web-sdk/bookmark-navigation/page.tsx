"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";
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

  const sidebar = (
    <>
      {/* Tab toggle */}
      <div className="p-4" style={{ borderBottom: "1px solid var(--line)" }}>
        <div
          className="flex gap-1 p-1"
          style={{
            background: "var(--surface)",
            borderRadius: "var(--r-2)",
            border: "1px solid var(--line)",
          }}
        >
          <button
            type="button"
            onClick={() => setTab("outline")}
            className="flex-1 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
            style={{
              background: tab === "outline" ? "var(--bg-elev)" : "transparent",
              color: tab === "outline" ? "var(--ink)" : "var(--ink-3)",
              borderRadius: "var(--r-1)",
              boxShadow:
                tab === "outline" ? "0 1px 2px rgba(0,0,0,0.06)" : undefined,
            }}
          >
            Outline ({outline.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("bookmarks")}
            className="flex-1 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
            style={{
              background:
                tab === "bookmarks" ? "var(--bg-elev)" : "transparent",
              color: tab === "bookmarks" ? "var(--ink)" : "var(--ink-3)",
              borderRadius: "var(--r-1)",
              boxShadow:
                tab === "bookmarks" ? "0 1px 2px rgba(0,0,0,0.06)" : undefined,
            }}
          >
            Bookmarks ({bookmarks.length})
          </button>
        </div>
        <div className="mt-2 text-xs" style={{ color: "var(--ink-3)" }}>
          Page {currentPage + 1} of {totalPages}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === "outline" ? (
          outline.length === 0 ? (
            <div
              className="p-4 text-sm text-center"
              style={{ color: "var(--ink-4)" }}
            >
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
          <div
            className="p-4 text-sm text-center"
            style={{ color: "var(--ink-4)" }}
          >
            This document has no bookmarks.
          </div>
        ) : (
          <div className="py-2">
            {bookmarks.map((bm) => {
              const isActive = bm.pageIndex === currentPage;
              return (
                <button
                  key={bm.id}
                  type="button"
                  onClick={() => goToPage(bm.pageIndex)}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer flex items-center justify-between"
                  style={{
                    background: isActive ? "var(--accent-tint)" : "transparent",
                    fontWeight: isActive ? 500 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "var(--accent-tint)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                    }
                  }}
                >
                  <span className="truncate" style={{ color: "var(--ink)" }}>
                    {bm.name}
                  </span>
                  {bm.pageIndex !== null && (
                    <span
                      className="text-xs tabular-nums ml-2 shrink-0"
                      style={{ color: "var(--ink-4)" }}
                    >
                      p.{bm.pageIndex + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );

  return (
    <SampleFrame
      title="Bookmark & Outline Navigation"
      description="Browse the document's table of contents (outline) and bookmarks in a custom sidebar. Click any entry to navigate directly to that page."
      sidebar={sidebar}
      sidebarSide="left"
      wide
    >
      <Viewer
        onOutline={handleOutline}
        onBookmarks={handleBookmarks}
        onCurrentPage={handleCurrentPage}
        onTotalPages={handleTotalPages}
      />
    </SampleFrame>
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
        className="w-full text-left py-2 pr-4 text-sm transition-colors cursor-pointer flex items-center justify-between"
        style={{
          paddingLeft: `${16 + depth * 16}px`,
          background: isActive ? "var(--accent-tint)" : "transparent",
          fontWeight: isActive ? 500 : 400,
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "var(--accent-tint)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.background = "transparent";
          }
        }}
      >
        <span
          className="truncate"
          style={{ color: isActive ? "var(--ink)" : "var(--ink-2)" }}
        >
          {node.title}
        </span>
        {node.pageIndex !== null && (
          <span
            className="text-xs tabular-nums ml-2 shrink-0"
            style={{ color: "var(--ink-4)" }}
          >
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
