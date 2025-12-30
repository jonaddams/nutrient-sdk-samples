"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

const SearchViewer = dynamic(() => import("@/app/web-sdk/search/viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading search viewer..." />,
});

export default function SearchPage() {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const webSDKVersion = process.env.NEXT_PUBLIC_WEB_SDK_VERSION;

  const openViewer = () => {
    setIsViewerOpen(true);
  };

  const closeViewer = () => {
    setIsViewerOpen(false);
  };

  if (isViewerOpen) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#1a1414]">
        {/* Header */}
        <header className="border-b border-[var(--warm-gray-400)] bg-white dark:bg-[#1a1414]">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white !mb-0">
                  Document Search
                </h1>
                <span className="nutrient-badge nutrient-badge-accent">
                  Web SDK v{webSDKVersion}
                </span>
              </div>
              <button
                type="button"
                onClick={closeViewer}
                className="btn btn-secondary"
              >
                Close Viewer
              </button>
            </div>
          </div>
        </header>

        {/* Viewer Container */}
        <div className="max-w-7xl mx-auto h-[calc(100vh-5rem)]">
          <SearchViewer document="/documents/20000-leagues-under-the-sea.pdf" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Document Search"
        description="Search through PDF documents with context-aware results and instant navigation"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-[#2a2020] rounded-xl p-6 border border-[var(--warm-gray-400)]">
            <div className="w-12 h-12 bg-[var(--digital-pollen)] dark:bg-[var(--digital-pollen)] rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-[var(--black)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Fast Search</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Fast Search
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Quickly find any text in your documents with instant results and
              highlighting.
            </p>
          </div>

          <div className="bg-white dark:bg-[#2a2020] rounded-xl p-6 border border-[var(--warm-gray-400)]">
            <div className="w-12 h-12 bg-[var(--data-green)] dark:bg-[var(--data-green)] rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-[var(--black)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Context Aware</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Context Preview
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              See surrounding text for each search result to understand the
              context before jumping to it.
            </p>
          </div>

          <div className="bg-white dark:bg-[#2a2020] rounded-xl p-6 border border-[var(--warm-gray-400)]">
            <div className="w-12 h-12 bg-[var(--code-coral)] dark:bg-[var(--code-coral)] rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-[var(--black)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Navigate Results</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Instant Navigation
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Jump directly to any search result in the document with automatic
              page navigation and highlighting.
            </p>
          </div>
        </div>

        {/* Document Preview Card */}
        <div className="bg-white dark:bg-[#2a2020] rounded-xl border border-[var(--warm-gray-400)] p-8 mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-20 bg-[var(--code-coral)] rounded-lg shadow-md flex items-center justify-center mr-4">
              <svg
                className="w-8 h-8 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <title>PDF Document</title>
                <path d="M8.267 14.68c-.184 0-.308.018-.372.036v1.178c.076.018.171.023.302.023.479 0 .774-.242.774-.651 0-.366-.254-.586-.704-.586zm3.487.012c-.2 0-.33.018-.407.036v2.61c.077.018.201.018.313.018.817.006 1.349-.444 1.349-1.396.006-.83-.479-1.268-1.255-1.268z" />
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM9.498 16.19c-.309.29-.765.42-1.296.42a2.23 2.23 0 0 1-.308-.018v1.426H7v-3.936A7.558 7.558 0 0 1 8.219 14c.557 0 .953.106 1.22.319.254.202.426.533.426.923-.001.392-.131.723-.367.948zm3.807 1.355c-.42.349-1.059.515-1.84.515-.468 0-.799-.03-1.024-.06v-3.917A7.947 7.947 0 0 1 11.66 14c.757 0 1.249.136 1.633.426.415.308.675.799.675 1.504 0 .763-.279 1.29-.663 1.615zM14 9h-1V4l5 5h-4z" />
              </svg>
            </div>
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sample Document
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                20,000 Leagues Under the Sea
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Try searching for terms like "nautilus", "ocean", or "captain"
              </p>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={openViewer}
              className="btn btn-primary"
              style={{
                background: "var(--digital-pollen)",
                color: "var(--black)",
              }}
            >
              <svg
                className="w-5 h-5 mr-2 inline-block"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Open Search Demo</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Open Search Demo
            </button>
          </div>
        </div>

        {/* Technical Details */}
        <div className="bg-white dark:bg-[#2a2020] rounded-xl border border-[var(--warm-gray-400)] p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            How It Works
          </h3>
          <ul className="space-y-3 text-gray-600 dark:text-gray-400">
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-[var(--digital-pollen)] mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <title>Check</title>
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Uses the Nutrient Web SDK{" "}
                <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  search()
                </code>{" "}
                API to find text matches across all pages
              </span>
            </li>
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-[var(--digital-pollen)] mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <title>Check</title>
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Extracts context snippets showing 125 characters before and
                after each match
              </span>
            </li>
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-[var(--digital-pollen)] mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <title>Check</title>
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Highlights search results in the document using{" "}
                <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                  HighlightAnnotation
                </code>{" "}
                for visual feedback
              </span>
            </li>
            <li className="flex items-start">
              <svg
                className="w-5 h-5 text-[var(--digital-pollen)] mr-3 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <title>Check</title>
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>
                Automatically navigates to the correct page when clicking on a
                search result
              </span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
