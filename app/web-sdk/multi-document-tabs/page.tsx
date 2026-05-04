"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

interface TabInfo {
  id: string;
  label: string;
  document: string;
}

const DEFAULT_TABS: TabInfo[] = [
  {
    id: "jacques-torres",
    label: "Jacques Torres Chocolate Chip Cookies",
    document: "/documents/jacques-torres-chocolate-chip-cookies-recipe.pdf",
  },
  {
    id: "nyt-best",
    label: "NYT Best Chocolate Chip Cookies",
    document: "/documents/NYT Best Chocolate Chip Cookies Recipe.pdf",
  },
  {
    id: "lemon-cake",
    label: "One-Bowl Lemon and Olive Oil Cake",
    document: "/documents/One-Bowl Lemon and Olive Oil Cake Recipe.pdf",
  },
  {
    id: "butterscotch",
    label: "Salted Butterscotch Chocolate Chunk Cookies",
    document:
      "/documents/Salted Butterscotch Chocolate Chunk Cookies Recipe (with Video).pdf",
  },
  {
    id: "tiny-salty",
    label: "Tiny, Salty, Chocolaty Cookies",
    document: "/documents/Tiny, Salty, Chocolaty Cookies Recipe.pdf",
  },
];

export default function MultiDocumentTabsPage() {
  const [tabs, setTabs] = useState<TabInfo[]>(DEFAULT_TABS);
  const [activeTabId, setActiveTabId] = useState(DEFAULT_TABS[0].id);
  const pagePositions = useRef<Record<string, number>>({});

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handlePageChange = useCallback(
    (pageIndex: number) => {
      pagePositions.current[activeTabId] = pageIndex;
    },
    [activeTabId],
  );

  const handleCloseTab = (id: string) => {
    const remaining = tabs.filter((t) => t.id !== id);
    if (remaining.length === 0) return;
    if (activeTabId === id) {
      setActiveTabId(remaining[0].id);
    }
    delete pagePositions.current[id];
    setTabs(remaining);
  };

  const handleAddFromUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const id = "upload-" + Date.now();
      const newTab: TabInfo = {
        id,
        label: file.name.replace(/\.pdf$/i, ""),
        document: url,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(id);
    };
    input.click();
  };

  return (
    <SampleFrame
      title="Multi-Document Tabs"
      description="View multiple PDF documents in a tabbed interface. Switch between documents while preserving page position. Upload your own PDFs to add new tabs."
    >
      <div className="flex flex-col h-full">
        {/* Tab bar */}
        <div
          className="flex items-center overflow-x-auto shrink-0"
          style={{
            background: "var(--surface)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm cursor-pointer transition-colors group relative"
                style={{
                  background: isActive ? "var(--bg-elev)" : "transparent",
                  color: isActive ? "var(--ink)" : "var(--ink-3)",
                  fontWeight: isActive ? 600 : 400,
                  borderRight: "1px solid var(--line)",
                  // Active tab gets a 2px accent rail along the top, lifts
                  // the bottom border so the tab visually merges with the
                  // viewer below — like a browser tab.
                  borderTop: `2px solid ${
                    isActive ? "var(--accent)" : "transparent"
                  }`,
                  marginBottom: isActive ? -1 : 0,
                  paddingBottom: isActive ? "calc(0.625rem + 1px)" : "0.625rem",
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
                <button
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className="truncate max-w-[160px] cursor-pointer"
                >
                  {tab.label}
                </button>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCloseTab(tab.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-all cursor-pointer ml-1"
                    style={{ color: "var(--ink-4)" }}
                    aria-label={"Close " + tab.label}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <title>Close tab</title>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={handleAddFromUpload}
            className="px-3 py-2.5 transition-colors cursor-pointer"
            style={{ color: "var(--ink-3)" }}
            aria-label="Upload a PDF"
            title="Upload a PDF"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <title>Add document</title>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Viewer */}
        <div className="flex-1 min-h-0">
          {activeTab && (
            <Viewer
              key={activeTab.id}
              document={activeTab.document}
              initialPage={pagePositions.current[activeTab.id] ?? 0}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </div>
    </SampleFrame>
  );
}
