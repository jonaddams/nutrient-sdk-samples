"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

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

  const sidebar = (
    <>
      {/* Controls */}
      <div
        className="p-4 space-y-3"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        {/* View mode toggle */}
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
            onClick={() => setViewMode("current")}
            className="flex-1 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
            style={{
              background:
                viewMode === "current" ? "var(--bg-elev)" : "transparent",
              color:
                viewMode === "current" ? "var(--ink)" : "var(--ink-3)",
              borderRadius: "var(--r-1)",
              boxShadow:
                viewMode === "current"
                  ? "0 1px 2px rgba(0,0,0,0.06)"
                  : undefined,
            }}
          >
            Current Page
          </button>
          <button
            type="button"
            onClick={() => setViewMode("all")}
            className="flex-1 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
            style={{
              background:
                viewMode === "all" ? "var(--bg-elev)" : "transparent",
              color: viewMode === "all" ? "var(--ink)" : "var(--ink-3)",
              borderRadius: "var(--r-1)",
              boxShadow:
                viewMode === "all" ? "0 1px 2px rgba(0,0,0,0.06)" : undefined,
            }}
          >
            All Pages
          </button>
        </div>

        {/* Stats */}
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: "var(--ink-3)" }}
        >
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
            className="btn btn-sm flex-1"
            style={
              copied
                ? { background: "var(--data-green)", borderColor: "var(--data-green)" }
                : undefined
            }
          >
            {copied ? "Copied!" : "Copy to Clipboard"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!displayText}
            className="btn btn-sm ghost"
          >
            Download .txt
          </button>
        </div>
      </div>

      {/* Extracted text */}
      <div className="flex-1 overflow-y-auto p-4">
        {pageTexts.length === 0 ? (
          <p
            className="text-sm text-center py-8"
            style={{ color: "var(--ink-4)" }}
          >
            Extracting text from document...
          </p>
        ) : displayText ? (
          <pre
            className="text-sm whitespace-pre-wrap font-mono leading-relaxed"
            style={{
              color: "var(--ink-2)",
              background: "transparent",
              border: 0,
              padding: 0,
            }}
          >
            {displayText}
          </pre>
        ) : (
          <p
            className="text-sm text-center py-8"
            style={{ color: "var(--ink-4)" }}
          >
            No text found on this page.
          </p>
        )}
      </div>
    </>
  );

  return (
    <SampleFrame
      title="Text Extraction"
      description="Extract text from PDF pages using the textLinesForPageIndex API. View text for the current page or the entire document, with copy and download options."
      sidebar={sidebar}
      sidebarSide="left"
      sidebarWidth={384}
    >
      <Viewer
        onPageTexts={handlePageTexts}
        onTotalPages={handleTotalPages}
        onCurrentPage={handleCurrentPage}
      />
    </SampleFrame>
  );
}
