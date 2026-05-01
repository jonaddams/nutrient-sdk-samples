"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

const DEFAULT_KEYWORDS = ["macaque", "monkey"];

interface HighlightResult {
  keyword: string;
  count: number;
  color: string;
}

export default function KeywordHighlightPage() {
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_KEYWORDS);
  const [inputValue, setInputValue] = useState("");
  const [highlightResults, setHighlightResults] = useState<HighlightResult[]>(
    [],
  );

  const handleAddKeyword = () => {
    const trimmed = inputValue.trim();
    if (
      trimmed &&
      !keywords.some((k) => k.toLowerCase() === trimmed.toLowerCase())
    ) {
      setKeywords((prev) => [...prev, trimmed]);
      setInputValue("");
    }
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywords((prev) => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  const handleHighlightResults = useCallback((results: HighlightResult[]) => {
    setHighlightResults(results);
  }, []);

  const totalMatches = highlightResults.reduce((sum, r) => sum + r.count, 0);

  const sidebar = (
    <>
      {/* Add keyword input */}
      <div
        className="p-4"
        style={{ borderBottom: "1px solid var(--line)" }}
      >
        <label
          htmlFor="keyword-input"
          className="block text-sm font-medium mb-2"
          style={{ color: "var(--ink-2)" }}
        >
          Keywords
        </label>
        <div className="flex gap-2">
          <input
            id="keyword-input"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a keyword..."
            className="flex-1 px-3 py-2 text-sm focus:outline-none"
            style={{
              background: "var(--bg-elev)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: "var(--r-2)",
            }}
          />
          <button
            type="button"
            onClick={handleAddKeyword}
            disabled={!inputValue.trim()}
            className="btn btn-sm"
          >
            Add
          </button>
        </div>
      </div>

      {/* Keyword list */}
      <div className="flex-1 overflow-y-auto p-4">
        {keywords.length === 0 ? (
          <p
            className="text-sm text-center py-4"
            style={{ color: "var(--ink-4)" }}
          >
            No keywords added. Type a keyword above and press Enter or click
            Add.
          </p>
        ) : (
          <div className="space-y-2">
            {keywords.map((keyword) => {
              const result = highlightResults.find(
                (r) => r.keyword === keyword,
              );
              return (
                <div
                  key={keyword}
                  className="flex items-center gap-2 px-3 py-2 group"
                  style={{
                    background: "var(--bg-elev)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-2)",
                  }}
                >
                  {result && (
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: result.color }}
                    />
                  )}
                  <span
                    className="flex-1 text-sm truncate"
                    style={{ color: "var(--ink)" }}
                  >
                    {keyword}
                  </span>
                  {result && (
                    <span
                      className="text-xs tabular-nums"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {result.count}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      handleRemoveKeyword(keywords.indexOf(keyword))
                    }
                    className="opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    style={{ color: "var(--ink-4)" }}
                    aria-label={`Remove "${keyword}"`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <title>Remove</title>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary footer */}
      {highlightResults.length > 0 && (
        <div
          className="p-4 text-xs"
          style={{
            borderTop: "1px solid var(--line)",
            color: "var(--ink-3)",
          }}
        >
          {totalMatches} match{totalMatches !== 1 ? "es" : ""} across{" "}
          {highlightResults.length} keyword
          {highlightResults.length !== 1 ? "s" : ""}
        </div>
      )}
    </>
  );

  return (
    <SampleFrame
      title="Keyword Highlight"
      description="Automatically search and highlight keywords in a document with color-coded annotations. Add or remove keywords to update highlights in real time."
      sidebar={sidebar}
      sidebarSide="left"
    >
      <Viewer keywords={keywords} onHighlightResults={handleHighlightResults} />
    </SampleFrame>
  );
}
