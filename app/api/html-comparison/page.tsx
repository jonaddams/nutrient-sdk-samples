"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { PageHeader } from "@/app/_components/PageHeader";

const DocumentComparisonViewer = dynamic(
  () => import("./_components/DocumentComparisonViewer"),
  {
    ssr: false,
  },
);

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

const inputStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  color: "var(--ink)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-2)",
};

export default function HtmlComparisonPage() {
  const [doc1, setDoc1] = useState<string>(
    "/text-comparison/text-comparison-a.pdf",
  );
  const [doc2, setDoc2] = useState<string>(
    "/text-comparison/text-comparison-b.pdf",
  );
  const [isComparing, setIsComparing] = useState(false);

  const startComparison = () => {
    setIsComparing(true);
  };

  const resetComparison = () => {
    setIsComparing(false);
  };

  if (isComparing) {
    return (
      <div className="min-h-screen" style={{ background: "var(--bg)" }}>
        <PageHeader
          title="HTML Comparison"
          description="Compare documents using Nutrient DWS API HTML conversion"
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Nutrient DWS API", href: "/api" },
          ]}
        />

        <main
          className="shell"
          style={{
            paddingTop: "var(--space-6)",
            paddingBottom: "var(--space-8)",
          }}
        >
          <div className="mb-4 flex justify-end">
            <button
              type="button"
              onClick={resetComparison}
              className="btn ghost btn-sm"
            >
              Back to Selection
            </button>
          </div>
          <div className="h-[calc(100vh-16rem)] overflow-hidden" style={cardStyle}>
            <DocumentComparisonViewer document1={doc1} document2={doc2} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PageHeader
        title="HTML Comparison"
        description="Compare documents using Nutrient DWS API to convert PDFs to HTML, preserving semantic structure while enabling accurate text comparison across pages."
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Nutrient DWS API", href: "/api" },
        ]}
      />

      <main
        className="shell"
        style={{
          paddingTop: "var(--space-6)",
          paddingBottom: "var(--space-8)",
        }}
      >
        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
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
                <title>Document Structure</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--ink)" }}
            >
              Semantic Structure
            </h3>
            <p style={{ color: "var(--ink-3)" }}>
              Preserves document structure like headings, lists, and paragraphs
              through HTML conversion.
            </p>
          </div>

          <div className="p-6" style={cardStyle}>
            <div
              className="w-12 h-12 flex items-center justify-center mx-auto mb-4"
              style={featureIconBg("var(--accent-2)")}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <title>API</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
            </div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--ink)" }}
            >
              Nutrient DWS API
            </h3>
            <p style={{ color: "var(--ink-3)" }}>
              Uses Nutrient DWS API for high-quality PDF to HTML conversion.
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
                <title>Cross-Page</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--ink)" }}
            >
              Cross-Page Comparison
            </h3>
            <p style={{ color: "var(--ink-3)" }}>
              Compares full document content regardless of page boundaries or
              layout changes.
            </p>
          </div>
        </div>

        {/* Document Selection */}
        <div className="p-8" style={cardStyle}>
          <h3
            className="text-2xl font-bold mb-6"
            style={{ color: "var(--ink)" }}
          >
            Select Documents to Compare
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div
              className="p-6"
              style={{
                border: "2px solid var(--line)",
                borderRadius: "var(--r-2)",
              }}
            >
              <label
                htmlFor="doc1-select"
                className="block text-sm font-medium mb-3"
                style={{ color: "var(--ink-2)" }}
              >
                Original Document
              </label>
              <select
                id="doc1-select"
                value={doc1}
                onChange={(e) => setDoc1(e.target.value)}
                className="w-full px-4 py-2 focus:outline-none"
                style={inputStyle}
              >
                <option value="/text-comparison/text-comparison-a.pdf">
                  Text Comparison Document A
                </option>
                <option value="/text-comparison/text-comparison-b.pdf">
                  Text Comparison Document B
                </option>
              </select>
              <div
                className="mt-4 flex items-center text-sm"
                style={{ color: "var(--ink-3)" }}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  style={{ color: "var(--accent)" }}
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

            <div
              className="p-6"
              style={{
                border: "2px solid var(--line)",
                borderRadius: "var(--r-2)",
              }}
            >
              <label
                htmlFor="doc2-select"
                className="block text-sm font-medium mb-3"
                style={{ color: "var(--ink-2)" }}
              >
                Modified Document
              </label>
              <select
                id="doc2-select"
                value={doc2}
                onChange={(e) => setDoc2(e.target.value)}
                className="w-full px-4 py-2 focus:outline-none"
                style={inputStyle}
              >
                <option value="/text-comparison/text-comparison-a.pdf">
                  Text Comparison Document A
                </option>
                <option value="/text-comparison/text-comparison-b.pdf">
                  Text Comparison Document B
                </option>
              </select>
              <div
                className="mt-4 flex items-center text-sm"
                style={{ color: "var(--ink-3)" }}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  style={{ color: "var(--data-green)" }}
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
              className="btn"
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

          <div
            className="mt-6 text-center text-sm"
            style={{ color: "var(--ink-3)" }}
          >
            <p>
              Tip: For best results, compare two versions of the same document
            </p>
            <p className="mt-2">
              Note: Requires Nutrient DWS API key (configured in environment
              variables)
            </p>
          </div>
        </div>

        <div
          className="mt-12 text-center text-sm"
          style={{ color: "var(--ink-4)" }}
        >
          <p>Powered by Nutrient DWS API • HTML-based comparison</p>
        </div>
      </main>
    </div>
  );
}
