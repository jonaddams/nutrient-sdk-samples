"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/app/_components/PageHeader";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading viewer...</p>
      </div>
    </div>
  ),
});

const SAMPLE_FILES = [
  {
    path: "/documents/server-log.txt",
    name: "Server Log",
    type: "txt",
    description: "Application server log with timestamps",
  },
  {
    path: "/documents/quarterly-sales.csv",
    name: "Quarterly Sales Report",
    type: "csv",
    description: "Regional sales data rendered as a table",
  },
  {
    path: "/documents/app-config.xml",
    name: "Application Config",
    type: "xml",
    description: "XML configuration with syntax highlighting",
  },
];

export default function TextViewerPage() {
  const [selectedFile, setSelectedFile] = useState(SAMPLE_FILES[0]);
  const [isConverting, setIsConverting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Fetch file content for preview when selection changes
  useEffect(() => {
    if (pdfUrl) return; // Don't fetch while viewing PDF

    let cancelled = false;
    setIsLoadingPreview(true);

    fetch(selectedFile.path)
      .then((res) => res.text())
      .then((text) => {
        if (!cancelled) setPreviewContent(text);
      })
      .catch(() => {
        if (!cancelled) setPreviewContent(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedFile, pdfUrl]);

  const handleConvert = useCallback(async () => {
    try {
      setIsConverting(true);
      setError(null);

      // Revoke previous URL
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }

      // Fetch the text file
      const fileResponse = await fetch(selectedFile.path);
      if (!fileResponse.ok) {
        throw new Error("Failed to fetch the text file");
      }
      const blob = await fileResponse.blob();

      // Send to our API for conversion
      const formData = new FormData();
      formData.append(
        "file",
        blob,
        selectedFile.path.split("/").pop() || "file.txt",
      );
      formData.append("fileType", selectedFile.type);

      const response = await fetch("/api/text-viewer/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to convert file");
      }

      const pdfBlob = await response.blob();
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setIsConverting(false);
    }
  }, [selectedFile, pdfUrl]);

  const handleReset = useCallback(() => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }
    setError(null);
  }, [pdfUrl]);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PageHeader
        title="Text File Viewer"
        description="View .txt, .csv, and .xml files in the Nutrient viewer by converting them to PDF via the DWS API"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Nutrient DWS API", href: "/api" },
        ]}
        actions={
          <a
            href="https://www.nutrient.io/api/reference/public/#tag/Document-Editing/operation/build-document"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-secondary"
          >
            API Documentation
          </a>
        }
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>Text to HTML</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
              Text to HTML
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Wraps plain text lines in styled HTML with readability-focused
              formatting
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>CSV Tables</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
              CSV Tables
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              CSV files are rendered as styled HTML tables for clear, structured
              data presentation
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-6 h-6 text-purple-600 dark:text-purple-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>DWS PDF Conversion</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
              DWS PDF Conversion
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              HTML is converted to PDF using the Nutrient DWS API /build
              endpoint
            </p>
          </div>
        </div>

        {/* File selection */}
        {!pdfUrl && (
          <div className="bg-blue-50 dark:bg-gray-900 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Select a Text File
            </h3>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-6">
              <div className="grid gap-3">
                {SAMPLE_FILES.map((file) => (
                  <label
                    key={file.path}
                    className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedFile.path === file.path
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="file-select"
                      value={file.path}
                      checked={selectedFile.path === file.path}
                      onChange={() => setSelectedFile(file)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {file.name}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-mono">
                          .{file.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {file.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              {/* File Preview */}
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedFile.path.split("/").pop()}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Original file preview
                  </span>
                </div>
                <div className="max-h-64 overflow-auto bg-gray-100 dark:bg-gray-900 p-4">
                  {isLoadingPreview ? (
                    <p className="text-gray-400 text-sm">Loading...</p>
                  ) : (
                    <pre
                      className="text-sm text-gray-800 dark:text-gray-100 font-mono whitespace-pre overflow-x-auto leading-relaxed"
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        color: "inherit",
                      }}
                    >
                      {previewContent}
                    </pre>
                  )}
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={isConverting}
                  className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--color-blue-600)",
                    color: "white",
                  }}
                >
                  {isConverting ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 mr-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <title>Loading</title>
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Converting...
                    </>
                  ) : (
                    "Convert & View as PDF"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Viewer */}
        {pdfUrl && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {selectedFile.name}
                <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">
                  (.{selectedFile.type} converted to PDF)
                </span>
              </h3>
              <div className="flex gap-3">
                <a
                  href={pdfUrl}
                  download={`${selectedFile.name}.pdf`}
                  className="btn btn-sm btn-secondary"
                >
                  Download PDF
                </a>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn btn-sm btn-secondary"
                >
                  Convert Another File
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-[calc(100vh-28rem)]">
                <Viewer documentUrl={pdfUrl} />
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        {!pdfUrl && (
          <details className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <summary className="text-xl font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:opacity-80">
              How It Works
            </summary>
            <ol className="mt-4 ml-5 space-y-2 text-gray-600 dark:text-gray-400 list-decimal">
              <li>Select a text-based file (.txt, .csv, or .xml)</li>
              <li>
                The file content is converted to styled HTML on the server:
                <div className="ml-2 mt-1 space-y-1">
                  <p>
                    &mdash; <strong>.txt</strong> lines are wrapped in paragraph
                    tags
                  </p>
                  <p>
                    &mdash; <strong>.csv</strong> data is rendered as a styled
                    HTML table
                  </p>
                  <p>
                    &mdash; <strong>.xml</strong> content gets syntax
                    highlighting
                  </p>
                </div>
              </li>
              <li>
                The HTML is sent to the Nutrient DWS API /build endpoint for PDF
                conversion
              </li>
              <li>
                The resulting PDF is displayed in the Nutrient Web SDK viewer
              </li>
            </ol>
          </details>
        )}

        {/* Footer */}
        {!pdfUrl && (
          <div className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
            <p>
              This sample demonstrates converting text-based files to PDF using
              the Nutrient DWS API. Requires NUTRIENT_API_KEY environment
              variable.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
