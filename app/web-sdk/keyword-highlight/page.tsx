"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

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

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Keyword Highlight"
        description="Automatically search and highlight keywords in a document with color-coded annotations. Add or remove keywords to update highlights in real time."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              {/* Add keyword input */}
              <div className="p-4 border-b border-[var(--warm-gray-400)]">
                <label
                  htmlFor="keyword-input"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
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
                    className="flex-1 px-3 py-2 border border-[var(--warm-gray-400)] rounded-md bg-white dark:bg-[#1a1414] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)] focus:border-[var(--digital-pollen)] text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    disabled={!inputValue.trim()}
                    className="px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    style={{
                      background: inputValue.trim()
                        ? "var(--digital-pollen)"
                        : "var(--warm-gray-400)",
                      color: "var(--black)",
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Keyword list */}
              <div className="flex-1 overflow-y-auto p-4">
                {keywords.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-500 text-center py-4">
                    No keywords added. Type a keyword above and press Enter or
                    click Add.
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
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-[#1a1414] border border-gray-200 dark:border-gray-700 group"
                        >
                          {result && (
                            <span
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: result.color }}
                            />
                          )}
                          <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate">
                            {keyword}
                          </span>
                          {result && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
                              {result.count}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              handleRemoveKeyword(keywords.indexOf(keyword))
                            }
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all cursor-pointer"
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
                <div className="p-4 border-t border-[var(--warm-gray-400)] text-xs text-gray-500 dark:text-gray-400">
                  {totalMatches} match{totalMatches !== 1 ? "es" : ""} across{" "}
                  {highlightResults.length} keyword
                  {highlightResults.length !== 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Viewer */}
            <div className="flex-1 min-w-0">
              <Viewer
                keywords={keywords}
                onHighlightResults={handleHighlightResults}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
