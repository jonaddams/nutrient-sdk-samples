"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useMemo, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

// Intersection observer lazy loading for maximum performance
const Viewer = dynamic(() => import("@/app/web-sdk/content-edit-api/viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Preparing document viewer..." />,
});

export default function ContentEditApiPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedCount, setSelectedCount] = useState(0);
  const [isContentEditing, setIsContentEditing] = useState(false);

  // Generate stable IDs for SVG titles
  const detectTextTitleId = useId();
  const findReplaceTitleId = useId();
  const aiRewordTitleId = useId();
  const editTextTitleId = useId();

  // Delayed PDF prefetch after initial render
  useEffect(() => {
    const timer = setTimeout(() => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.href = "/documents/sample-doc-with-google-fonts.pdf";
      document.head.appendChild(link);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Listen for editing state changes from the viewer
  useEffect(() => {
    const handleEditingStateChange = (event: CustomEvent) => {
      setIsEditing(event.detail.isEditing);
      // Reset selected count when editing mode changes
      if (!event.detail.isEditing) {
        setSelectedCount(0);
      }
    };

    const handleSelectedBlocksChange = (event: CustomEvent) => {
      setSelectedCount(event.detail.selectedCount);
    };

    const handleContentEditingStateChange = (event: CustomEvent) => {
      setIsContentEditing(event.detail.isContentEditing);
    };

    // Set up global event listeners
    window.addEventListener(
      "editingStateChange",
      handleEditingStateChange as EventListener,
    );
    window.addEventListener(
      "selectedBlocksChange",
      handleSelectedBlocksChange as EventListener,
    );
    window.addEventListener(
      "contentEditingStateChange",
      handleContentEditingStateChange as EventListener,
    );

    return () => {
      window.removeEventListener(
        "editingStateChange",
        handleEditingStateChange as EventListener,
      );
      window.removeEventListener(
        "selectedBlocksChange",
        handleSelectedBlocksChange as EventListener,
      );
      window.removeEventListener(
        "contentEditingStateChange",
        handleContentEditingStateChange as EventListener,
      );
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--warm-gray-100)] dark:bg-[#1a1414]">
      {/* Header */}
      <SampleHeader
        title="Content Editing API"
        description="Detect text blocks, find & replace text, use AI to reword content, and edit text directly in PDF documents"
      />

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto w-full px-6 pb-8">
        <div className="flex flex-1 flex-col lg:flex-row h-[calc(100vh-12rem)] border-l border-r border-b border-[var(--warm-gray-400)] dark:border-[var(--warm-gray-800)]">
          {/* Mobile: Top buttons, Desktop: Sidebar */}
          <aside className="bg-white dark:bg-[var(--warm-gray-950)] border-b lg:border-r lg:border-b-0 border-[var(--warm-gray-400)] dark:border-[var(--warm-gray-800)] lg:w-64 shrink-0">
            <div className="px-4 py-3 lg:py-6 lg:h-full">
              <h2 className="sr-only">PDF Editing Tools</h2>
              <nav
                className="flex flex-row lg:flex-col gap-2 lg:gap-0 lg:space-y-3 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0"
                aria-label="PDF editing tools"
              >
                <button
                  type="button"
                  onClick={() =>
                    !isContentEditing && window.viewerInstance?.detectText?.()
                  }
                  disabled={isContentEditing}
                  className={`w-auto lg:w-full shrink-0 flex items-center px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium rounded-lg border transition-all duration-200 whitespace-nowrap ${
                    isContentEditing
                      ? "bg-[var(--warm-gray-200)] dark:bg-[var(--warm-gray-800)] text-[var(--warm-gray-600)] dark:text-[var(--warm-gray-600)] border-[var(--warm-gray-400)] dark:border-[var(--warm-gray-800)] cursor-not-allowed"
                      : isEditing
                        ? "bg-[var(--data-green)] text-[var(--black)] border-[var(--data-green)] hover:opacity-90 shadow-sm cursor-pointer"
                        : "bg-[var(--warm-gray-200)] dark:bg-[var(--warm-gray-900)] text-[var(--black)] dark:text-[var(--warm-gray-400)] border-[var(--warm-gray-400)] dark:border-[var(--warm-gray-800)] hover:bg-[var(--warm-gray-400)] dark:hover:bg-[var(--warm-gray-800)] cursor-pointer"
                  }`}
                  title={
                    isContentEditing
                      ? "Cannot use Detect Text while Edit Text is active"
                      : isEditing
                        ? "Click to exit text detection mode"
                        : "Detect and highlight text blocks in the document"
                  }
                >
                  <svg
                    className="mr-1 lg:mr-3 h-4 lg:h-5 w-4 lg:w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-labelledby={detectTextTitleId}
                  >
                    <title id={detectTextTitleId}>Detect text blocks</title>
                    <path d="M0 0h24v24H0z" fill="none" />
                    <rect
                      x="5"
                      y="5"
                      width="12"
                      height="12"
                      stroke="currentColor"
                      fill="none"
                      strokeWidth="2"
                    />
                    <rect
                      x="9"
                      y="9"
                      width="12"
                      height="12"
                      stroke="currentColor"
                      fill="none"
                      strokeWidth="2"
                    />
                  </svg>
                  <span className="hidden sm:inline">Detect Text</span>
                  <span className="sm:hidden">Detect</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    isEditing &&
                    selectedCount === 0 &&
                    !isContentEditing &&
                    window.viewerInstance?.toggleFindReplace?.()
                  }
                  disabled={!isEditing || selectedCount > 0 || isContentEditing}
                  className={`w-auto lg:w-full shrink-0 flex items-center px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium rounded-lg border transition-all duration-200 whitespace-nowrap ${
                    isEditing && selectedCount === 0 && !isContentEditing
                      ? "bg-[var(--black)] dark:bg-[var(--digital-pollen)] text-white dark:text-[var(--black)] border-[var(--black)] dark:border-[var(--digital-pollen)] hover:opacity-90 shadow-sm cursor-pointer"
                      : "bg-[var(--warm-gray-200)] dark:bg-[var(--warm-gray-800)] text-[var(--warm-gray-600)] dark:text-[var(--warm-gray-600)] border-[var(--warm-gray-400)] dark:border-[var(--warm-gray-800)] cursor-not-allowed"
                  }`}
                  title={
                    isContentEditing
                      ? "Cannot use Find & Replace while Edit Text is active"
                      : !isEditing
                        ? "Enable Content Boxes mode first"
                        : selectedCount > 0
                          ? `Deselect ${selectedCount} text block${selectedCount > 1 ? "s" : ""} to use Find & Replace`
                          : "Find & Replace text across all blocks"
                  }
                >
                  <svg
                    className="mr-1 lg:mr-3 h-4 lg:h-5 w-4 lg:w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    role="img"
                    aria-labelledby={findReplaceTitleId}
                  >
                    <title id={findReplaceTitleId}>Find and replace text</title>
                    <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z" />
                    <circle
                      cx="18"
                      cy="7"
                      r="2"
                      fill={
                        isEditing && selectedCount === 0 && !isContentEditing
                          ? "white"
                          : "#6b7280"
                      }
                    />
                    <path
                      d="M16.5 11.5l3 3-3 3M20 14.5h-4"
                      stroke={
                        isEditing && selectedCount === 0 && !isContentEditing
                          ? "white"
                          : "#6b7280"
                      }
                      strokeWidth="1.5"
                      fill="none"
                    />
                  </svg>
                  <span className="hidden sm:inline">Find & Replace</span>
                  <span className="sm:hidden">Find</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    isEditing &&
                    selectedCount > 0 &&
                    !isContentEditing &&
                    window.viewerInstance?.triggerAIReplace?.()
                  }
                  disabled={
                    !isEditing || selectedCount === 0 || isContentEditing
                  }
                  className={`w-auto lg:w-full shrink-0 flex items-center px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium rounded-lg border transition-all duration-200 whitespace-nowrap ${
                    isEditing && selectedCount > 0 && !isContentEditing
                      ? "bg-[var(--code-coral)] text-[var(--black)] border-[var(--code-coral)] hover:opacity-90 shadow-sm cursor-pointer"
                      : "bg-[var(--warm-gray-200)] dark:bg-[var(--warm-gray-800)] text-[var(--warm-gray-600)] dark:text-[var(--warm-gray-600)] border-[var(--warm-gray-400)] dark:border-[var(--warm-gray-800)] cursor-not-allowed"
                  }`}
                  title={
                    isContentEditing
                      ? "Cannot use AI Reword while Edit Text is active"
                      : !isEditing
                        ? "Enable Content Boxes mode first"
                        : selectedCount === 0
                          ? "Select text blocks first (click on blue boxes to turn them red)"
                          : `Reword ${selectedCount} selected text block${selectedCount > 1 ? "s" : ""} with AI`
                  }
                >
                  <svg
                    className="mr-1 lg:mr-3 h-4 lg:h-5 w-4 lg:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    role="img"
                    aria-labelledby={aiRewordTitleId}
                  >
                    <title id={aiRewordTitleId}>Reword text with AI</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Reword with AI</span>
                  <span className="sm:hidden">AI</span>
                  {selectedCount > 0 && (
                    <span className="ml-auto bg-white/20 text-xs px-1 lg:px-2 py-1 rounded-full">
                      {selectedCount}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    !isEditing && window.viewerInstance?.toggleContentEditor?.()
                  }
                  disabled={isEditing}
                  className={`w-auto lg:w-full shrink-0 flex items-center px-3 lg:px-4 py-2 lg:py-3 text-xs lg:text-sm font-medium rounded-lg border transition-all duration-200 whitespace-nowrap ${
                    isEditing
                      ? "bg-[var(--warm-gray-200)] dark:bg-[var(--warm-gray-800)] text-[var(--warm-gray-600)] dark:text-[var(--warm-gray-600)] border-[var(--warm-gray-400)] dark:border-[var(--warm-gray-800)] cursor-not-allowed"
                      : isContentEditing
                        ? "bg-[var(--disc-pink)] text-[var(--black)] border-[var(--disc-pink)] hover:opacity-90 shadow-sm cursor-pointer"
                        : "bg-[var(--warm-gray-200)] dark:bg-[var(--warm-gray-900)] text-[var(--black)] dark:text-[var(--warm-gray-400)] border-[var(--warm-gray-400)] dark:border-[var(--warm-gray-800)] hover:bg-[var(--warm-gray-400)] dark:hover:bg-[var(--warm-gray-800)] cursor-pointer"
                  }`}
                  title={
                    isEditing
                      ? "Cannot use Edit Text while Detect Text is active"
                      : isContentEditing
                        ? "Exit Edit Text mode"
                        : "Enter Edit Text mode"
                  }
                >
                  <svg
                    className="mr-1 lg:mr-3 h-4 lg:h-5 w-4 lg:w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    role="img"
                    aria-labelledby={editTextTitleId}
                  >
                    <title id={editTextTitleId}>Edit text directly</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span className="hidden sm:inline">Edit Text</span>
                  <span className="sm:hidden">Edit</span>
                </button>
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-hidden">
            <div className="h-full">
              {useMemo(
                () => (
                  <Viewer document="/documents/sample-doc-with-google-fonts.pdf" />
                ),
                [],
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
