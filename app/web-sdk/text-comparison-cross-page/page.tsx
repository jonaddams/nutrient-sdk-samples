"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

const DocumentComparisonViewer = dynamic(
  () => import("@/app/web-sdk/_components/DocumentComparisonViewer"),
  {
    ssr: false,
  },
);

export default function CrossPageTextComparisonPage() {
  const [doc1, setDoc1] = useState<string>("/documents/text-comparison-a.pdf");
  const [doc2, setDoc2] = useState<string>("/documents/text-comparison-b.pdf");
  const [isComparing, setIsComparing] = useState(false);

  const startComparison = () => {
    setIsComparing(true);
  };

  const resetComparison = () => {
    setIsComparing(false);
  };

  if (isComparing) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#1a1414]">
        <SampleHeader
          title="Cross-Page Text Comparison"
          description="Compare document text content across page boundaries"
        />

        {/* Comparison Container */}
        <div className="max-w-7xl mx-auto px-6 pb-8">
          <div className="mb-4 mt-4 flex justify-end">
            <button
              type="button"
              onClick={resetComparison}
              className="btn btn-sm btn-secondary"
            >
              Back to Selection
            </button>
          </div>
          <div className="h-[calc(100vh-16rem)]">
            <DocumentComparisonViewer document1={doc1} document2={doc2} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Cross-Page Text Comparison"
        description="Compare document text content across page boundaries. Unlike traditional page-by-page comparison, this tool extracts and compares the full text to provide accurate diff results even when content shifts between pages."
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Text Extraction</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Smart Text Extraction
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Uses Nutrient SDK to extract complete text content from documents.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-yellow-600 dark:text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Cross-Page</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Cross-Page Comparison
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Accurately compares text regardless of page layout changes.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-red-600 dark:text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Visual Diff</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Visual Diff Display
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Highlights additions, deletions, and modifications clearly.
            </p>
          </div>
        </div>

        {/* Document Selection */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Select Documents to Compare
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Document 1 */}
            <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <label
                htmlFor="doc1-select"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
              >
                Original Document
              </label>
              <select
                id="doc1-select"
                value={doc1}
                onChange={(e) => setDoc1(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="/documents/text-comparison-a.pdf">
                  Text Comparison Document A
                </option>
                <option value="/documents/text-comparison-b.pdf">
                  Text Comparison Document B
                </option>
              </select>
              <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <svg
                  className="w-5 h-5 mr-2 text-blue-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <title>Info</title>
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Baseline document
              </div>
            </div>

            {/* Document 2 */}
            <div className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6">
              <label
                htmlFor="doc2-select"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3"
              >
                Modified Document
              </label>
              <select
                id="doc2-select"
                value={doc2}
                onChange={(e) => setDoc2(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="/documents/text-comparison-a.pdf">
                  Text Comparison Document A
                </option>
                <option value="/documents/text-comparison-b.pdf">
                  Text Comparison Document B
                </option>
              </select>
              <div className="mt-4 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <svg
                  className="w-5 h-5 mr-2 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <title>Info</title>
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                Comparison document
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={startComparison}
              className="btn btn-primary"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Compare</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Compare Documents
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Tip: For best results, compare two versions of the same document
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
          <p>Powered by Nutrient Web SDK • Text-based comparison system</p>
        </div>
      </main>
    </div>
  );
}
