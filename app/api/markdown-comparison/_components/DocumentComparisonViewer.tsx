"use client";

import { useEffect, useState } from "react";
import { convertPdfToMarkdown } from "../_lib/pdf-to-markdown";
import FormattedComparison from "./FormattedComparison";

interface DocumentComparisonViewerProps {
  document1: string | ArrayBuffer;
  document2: string | ArrayBuffer;
}

export default function DocumentComparisonViewer({
  document1,
  document2,
}: DocumentComparisonViewerProps) {
  const [markdown1, setMarkdown1] = useState<string>("");
  const [markdown2, setMarkdown2] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [conversionProgress, setConversionProgress] = useState<string>("");

  useEffect(() => {
    async function convertDocuments() {
      try {
        setLoading(true);
        setError(null);

        // Convert first document to markdown
        setConversionProgress("Converting first document to Markdown...");
        const md1 = await convertPdfToMarkdown(document1);
        setMarkdown1(md1);

        // Convert second document to markdown
        setConversionProgress("Converting second document to Markdown...");
        const md2 = await convertPdfToMarkdown(document2);
        setMarkdown2(md2);

        setConversionProgress("Comparison ready!");
        setLoading(false);
      } catch (err) {
        console.error("Error converting documents:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to convert documents to Markdown",
        );
        setLoading(false);
      }
    }

    convertDocuments();
  }, [document1, document2]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {conversionProgress || "Converting documents..."}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            This may take a moment for large documents
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>Error</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Conversion Failed
          </h3>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-700 dark:to-indigo-700 text-white px-6 py-4">
        <h2 className="text-xl font-bold">Markdown Comparison Results</h2>
        <p className="text-sm text-purple-100 mt-1">
          Structured document comparison with semantic formatting preserved
        </p>
      </div>

      {/* Formatted diff display */}
      <div className="flex-1 overflow-hidden">
        <FormattedComparison markdown1={markdown1} markdown2={markdown2} />
      </div>
    </div>
  );
}
