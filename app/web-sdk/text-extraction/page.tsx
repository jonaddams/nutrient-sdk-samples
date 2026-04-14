"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

interface PageText {
  pageIndex: number;
  text: string;
}

export default function TextExtractionPage() {
  const [pageTexts, setPageTexts] = useState<PageText[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<"current" | "all">("current");
  const [copied, setCopied] = useState(false);

  const handlePageTexts = useCallback((pages: PageText[]) => {
    setPageTexts(pages);
  }, []);

  const handleTotalPages = useCallback((count: number) => {
    setTotalPages(count);
  }, []);

  const handleCurrentPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const currentPageText = pageTexts.find((p) => p.pageIndex === currentPage);
  const displayText =
    viewMode === "current"
      ? (currentPageText?.text ?? "")
      : pageTexts
          .map((p) => `--- Page ${p.pageIndex + 1} ---\n${p.text}`)
          .join("\n\n");

  const wordCount = displayText.split(/\s+/).filter((w) => w.length > 0).length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([displayText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      viewMode === "current"
        ? `page-${currentPage + 1}-text.txt`
        : "full-document-text.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Text Extraction"
        description="Extract text from PDF pages using the textLinesForPageIndex API. View text for the current page or the entire document, with copy and download options."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-96 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              {/* Controls */}
              <div className="p-4 border-b border-[var(--warm-gray-400)] space-y-3">
                {/* View mode toggle */}
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1414] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setViewMode("current")}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      viewMode === "current"
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Current Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("all")}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      viewMode === "all"
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    All Pages
                  </button>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {viewMode === "current"
                      ? `Page ${currentPage + 1} of ${totalPages}`
                      : `${totalPages} pages`}
                  </span>
                  <span className="tabular-nums">
                    {wordCount} word{wordCount !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!displayText}
                    className="flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: copied ? "#22c55e" : "var(--digital-pollen)",
                      color: "var(--black)",
                    }}
                  >
                    {copied ? "Copied!" : "Copy to Clipboard"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={!displayText}
                    className="px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      color: "var(--digital-pollen)",
                      border: "1px solid var(--digital-pollen)",
                      background: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (displayText) {
                        e.currentTarget.style.background =
                          "var(--digital-pollen)";
                        e.currentTarget.style.color = "var(--black)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--digital-pollen)";
                    }}
                  >
                    Download .txt
                  </button>
                </div>
              </div>

              {/* Extracted text */}
              <div className="flex-1 overflow-y-auto p-4">
                {pageTexts.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-8">
                    Extracting text from document...
                  </p>
                ) : displayText ? (
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {displayText}
                  </pre>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-8">
                    No text found on this page.
                  </p>
                )}
              </div>
            </div>

            {/* Viewer */}
            <div className="flex-1 min-w-0">
              <Viewer
                onPageTexts={handlePageTexts}
                onTotalPages={handleTotalPages}
                onCurrentPage={handleCurrentPage}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
