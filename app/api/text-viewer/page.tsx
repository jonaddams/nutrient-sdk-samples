"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/app/_components/PageHeader";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div
          className="inline-block animate-spin rounded-full h-8 w-8 mb-4"
          style={{
            border: "2px solid var(--line)",
            borderBottomColor: "var(--accent)",
          }}
        />
        <p style={{ color: "var(--ink-3)" }}>Loading viewer...</p>
      </div>
    </div>
  ),
});

const cardStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-3)",
};

const featureIconBg = (token: string): React.CSSProperties => ({
  background: `color-mix(in srgb, ${token} 18%, var(--bg-elev))`,
  color: token,
  borderRadius: "var(--r-2)",
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

  useEffect(() => {
    if (pdfUrl) return;

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

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }

      const fileResponse = await fetch(selectedFile.path);
      if (!fileResponse.ok) {
        throw new Error("Failed to fetch the text file");
      }
      const blob = await fileResponse.blob();

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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
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
            className="btn ghost btn-sm"
          >
            API Documentation
          </a>
        }
      />

      <main
        className="shell"
        style={{
          paddingTop: "var(--space-6)",
          paddingBottom: "var(--space-8)",
        }}
      >
        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="p-6" style={cardStyle}>
            <div
              className="w-12 h-12 flex items-center justify-center mx-auto mb-4"
              style={featureIconBg("var(--accent)")}
            >
              <svg
                className="w-6 h-6"
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
            <h3
              className="text-lg font-semibold mb-2 text-center"
              style={{ color: "var(--ink)" }}
            >
              Text to HTML
            </h3>
            <p className="text-center" style={{ color: "var(--ink-3)" }}>
              Wraps plain text lines in styled HTML with readability-focused
              formatting
            </p>
          </div>

          <div className="p-6" style={cardStyle}>
            <div
              className="w-12 h-12 flex items-center justify-center mx-auto mb-4"
              style={featureIconBg("var(--data-green)")}
            >
              <svg
                className="w-6 h-6"
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
            <h3
              className="text-lg font-semibold mb-2 text-center"
              style={{ color: "var(--ink)" }}
            >
              CSV Tables
            </h3>
            <p className="text-center" style={{ color: "var(--ink-3)" }}>
              CSV files are rendered as styled HTML tables for clear, structured
              data presentation
            </p>
          </div>

          <div className="p-6" style={cardStyle}>
            <div
              className="w-12 h-12 flex items-center justify-center mx-auto mb-4"
              style={featureIconBg("var(--disc-pink)")}
            >
              <svg
                className="w-6 h-6"
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
            <h3
              className="text-lg font-semibold mb-2 text-center"
              style={{ color: "var(--ink)" }}
            >
              DWS PDF Conversion
            </h3>
            <p className="text-center" style={{ color: "var(--ink-3)" }}>
              HTML is converted to PDF using the Nutrient DWS API /build
              endpoint
            </p>
          </div>
        </div>

        {/* File selection */}
        {!pdfUrl && (
          <div className="p-8 mb-8" style={cardStyle}>
            <h3
              className="text-2xl font-bold mb-6"
              style={{ color: "var(--ink)" }}
            >
              Select a Text File
            </h3>

            {error && (
              <div
                className="mb-6 p-4"
                style={{
                  background:
                    "color-mix(in srgb, var(--code-coral) 12%, var(--bg-elev))",
                  border:
                    "1px solid color-mix(in srgb, var(--code-coral) 35%, var(--line))",
                  borderRadius: "var(--r-2)",
                  color: "var(--code-coral)",
                }}
              >
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-6">
              <div className="grid gap-3">
                {SAMPLE_FILES.map((file) => {
                  const isSelected = selectedFile.path === file.path;
                  return (
                    <label
                      key={file.path}
                      className="flex items-center gap-4 p-4 cursor-pointer transition-colors"
                      style={{
                        border: `1px solid ${
                          isSelected ? "var(--accent)" : "var(--line)"
                        }`,
                        background: isSelected
                          ? "var(--accent-tint)"
                          : "var(--bg-elev)",
                        borderRadius: "var(--r-2)",
                      }}
                    >
                      <input
                        type="radio"
                        name="file-select"
                        value={file.path}
                        checked={isSelected}
                        onChange={() => setSelectedFile(file)}
                        className="h-4 w-4 cursor-pointer"
                        style={{ accentColor: "var(--accent)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-medium"
                            style={{ color: "var(--ink)" }}
                          >
                            {file.name}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 font-mono"
                            style={{
                              background: "var(--surface)",
                              color: "var(--ink-3)",
                              borderRadius: "var(--r-pill)",
                              border: "1px solid var(--line)",
                            }}
                          >
                            .{file.type}
                          </span>
                        </div>
                        <p
                          className="text-sm mt-1"
                          style={{ color: "var(--ink-3)" }}
                        >
                          {file.description}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* File Preview */}
              <div
                className="overflow-hidden"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--r-2)",
                }}
              >
                <div
                  className="flex items-center justify-between px-4 py-2"
                  style={{
                    background: "var(--surface)",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--ink-2)" }}
                  >
                    {selectedFile.path.split("/").pop()}
                  </span>
                  <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                    Original file preview
                  </span>
                </div>
                <div
                  className="max-h-64 overflow-auto p-4"
                  style={{ background: "var(--surface)" }}
                >
                  {isLoadingPreview ? (
                    <p className="text-sm" style={{ color: "var(--ink-4)" }}>
                      Loading...
                    </p>
                  ) : (
                    <pre
                      className="text-sm font-mono whitespace-pre overflow-x-auto leading-relaxed"
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        color: "var(--ink-2)",
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
                  className="btn disabled:opacity-50 disabled:cursor-not-allowed"
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
              <h3
                className="text-2xl font-bold"
                style={{ color: "var(--ink)" }}
              >
                {selectedFile.name}
                <span
                  className="ml-2 text-base font-normal"
                  style={{ color: "var(--ink-3)" }}
                >
                  (.{selectedFile.type} converted to PDF)
                </span>
              </h3>
              <div className="flex gap-3">
                <a
                  href={pdfUrl}
                  download={`${selectedFile.name}.pdf`}
                  className="btn ghost btn-sm"
                >
                  Download PDF
                </a>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn ghost btn-sm"
                >
                  Convert Another File
                </button>
              </div>
            </div>

            <div className="overflow-hidden" style={cardStyle}>
              <div className="h-[calc(100vh-28rem)]">
                <Viewer documentUrl={pdfUrl} />
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        {!pdfUrl && (
          <details className="p-6" style={cardStyle}>
            <summary
              className="text-xl font-semibold cursor-pointer hover:opacity-80"
              style={{ color: "var(--ink)" }}
            >
              How It Works
            </summary>
            <ol
              className="mt-4 ml-5 space-y-2 list-decimal"
              style={{ color: "var(--ink-2)" }}
            >
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

        {!pdfUrl && (
          <div
            className="mt-6 text-sm text-center"
            style={{ color: "var(--ink-3)" }}
          >
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
