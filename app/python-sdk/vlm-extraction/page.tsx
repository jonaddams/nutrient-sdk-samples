"use client";

import { useCallback, useState } from "react";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL || "http://localhost:8080";

const SAMPLE_DOCUMENTS = [
  {
    label: "Account Registration Form",
    path: "/documents/account-registration-form.pdf",
    filename: "account-registration-form.pdf",
    cachedResult: "/documents/account-registration-form-vlm-result.json",
  },
];

const TOOLBAR_ITEMS = [
  { type: "zoom-out" },
  { type: "zoom-in" },
  { type: "zoom-mode" },
];

interface WordResult {
  text: string;
  confidence: number;
  bounds: { x: number; y: number; width: number; height: number };
}

interface TextElement {
  readingOrder: number;
  type: string;
  role?: string;
  text: string;
  confidence: number;
  words?: WordResult[];
  bounds: { x: number; y: number; width: number; height: number };
}

interface ExtractionResult {
  engine: string;
  filename: string;
  statistics: {
    totalElements: number;
    textElements: number;
    averageConfidence: number;
    lowConfidenceElements: number;
  };
  fullText: string;
  textElements: TextElement[];
  rawElements: unknown[];
}

type ViewMode = "formatted" | "json";

export default function VlmExtractionPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [resultExpanded, setResultExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("formatted");
  const [error, setError] = useState<string | null>(null);

  const selected = SAMPLE_DOCUMENTS[selectedIndex] as {
    label: string;
    path: string;
    filename: string;
    cachedResult?: string;
  };

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    setResult(null);
    setResultExpanded(false);

    try {
      if (selected.cachedResult) {
        const res = await fetch(selected.cachedResult);
        if (!res.ok) throw new Error(`Failed to load cached result`);
        const data: ExtractionResult = await res.json();
        setResult(data);
      } else {
        const response = await fetch(selected.path);
        const blob = await response.blob();
        const file = new File([blob], selected.filename);

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_BASE}/api/extraction/vlm`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error(`API returned ${res.status}`);

        const data: ExtractionResult = await res.json();
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "VLM extraction failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleDocumentChange = useCallback((index: number) => {
    setSelectedIndex(index);
    setResult(null);
    setResultExpanded(false);
    setError(null);
  }, []);

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${selected.filename.replace(/\.[^.]+$/, "")}-vlm.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.7) return "text-[var(--data-green)]";
    if (c >= 0.4) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-500 dark:text-red-400";
  };

  const confidenceBg = (c: number) => {
    if (c >= 0.7) return "bg-green-100 dark:bg-green-900/30";
    if (c >= 0.4) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PythonSampleHeader
        title="VLM-Enhanced Extraction"
        description="Extract structured data from documents using VLM-enhanced ICR with Claude as the Vision Language Model provider."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-[var(--bg-elev)] rounded-xl shadow-lg border border-[var(--line)] overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel — Controls */}
            <div className="w-80 border-r border-[var(--line)] bg-[var(--bg-elev)] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--line)]">
                <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                  Source Document
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <select
                  value={selectedIndex}
                  onChange={(e) => handleDocumentChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--line-strong)] bg-[var(--bg-elev)] text-[var(--ink)]"
                >
                  {SAMPLE_DOCUMENTS.map((doc, i) => (
                    <option key={doc.path} value={i}>
                      {doc.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={processing}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                  }}
                >
                  {processing ? "Extracting..." : "Extract Content"}
                </button>

                {error && (
                  <div className="p-3 bg-[color-mix(in_srgb,var(--code-coral)_12%,var(--bg-elev))] rounded-md text-[var(--code-coral)] text-xs">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel — Viewer + Results */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Viewer */}
              <div
                className={`relative ${result && !resultExpanded ? "h-[55%]" : "flex-1"} ${resultExpanded ? "hidden" : ""}`}
              >
                {processing && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60">
                    <div className="text-center space-y-2">
                      <div className="inline-block w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-[var(--ink-3)]">
                        Running VLM-enhanced extraction...
                      </p>
                    </div>
                  </div>
                )}

                <PdfViewer
                  document={selected.path}
                  toolbarItems={TOOLBAR_ITEMS}
                />
              </div>

              {/* Extracted Content Panel */}
              {result && (
                <div
                  className={`border-t border-[var(--line)] flex flex-col ${resultExpanded ? "flex-1" : "h-[45%]"}`}
                >
                  <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--line)] flex-shrink-0">
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                        Extracted Content
                      </h3>
                      <span className="text-xs text-[var(--ink-3)]">
                        {result.statistics.textElements} text regions
                        {" | "}
                        <span
                          className={confidenceColor(
                            result.statistics.averageConfidence,
                          )}
                        >
                          {Math.round(
                            result.statistics.averageConfidence * 100,
                          )}
                          % avg confidence
                        </span>
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex rounded-md border border-[var(--line-strong)] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setViewMode("formatted")}
                          className={`px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                            viewMode === "formatted"
                              ? "bg-[var(--surface)] text-[var(--ink)]"
                              : "text-[var(--ink-3)] hover:bg-[var(--surface)]"
                          }`}
                        >
                          Formatted
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode("json")}
                          className={`px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                            viewMode === "json"
                              ? "bg-[var(--surface)] text-[var(--ink)]"
                              : "text-[var(--ink-3)] hover:bg-[var(--surface)]"
                          }`}
                        >
                          JSON
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleDownload}
                        className="px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                      >
                        Download
                      </button>
                      <button
                        type="button"
                        onClick={() => setResultExpanded(!resultExpanded)}
                        className="px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                      >
                        {resultExpanded ? "Collapse" : "Expand"}
                      </button>
                    </div>
                  </div>

                  {viewMode === "formatted" ? (
                    <div className="flex-1 overflow-auto p-4 bg-[var(--bg-elev)] space-y-3">
                      {result.textElements.map((el) => (
                        <div
                          key={el.readingOrder}
                          className="rounded-lg border border-[var(--line)] overflow-hidden"
                        >
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--surface)] border-b border-[var(--line)]">
                            <span className="text-[10px] font-mono text-[var(--ink-4)] w-5 text-right">
                              {el.readingOrder}
                            </span>
                            <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--ink-3)]">
                              {el.role || el.type}
                            </span>
                            <span
                              className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${confidenceBg(el.confidence)} ${confidenceColor(el.confidence)}`}
                            >
                              {Math.round(el.confidence * 100)}%
                            </span>
                          </div>
                          <div className="px-3 py-2">
                            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                              {el.words
                                ? el.words.map((w, i) => (
                                    <span key={i}>
                                      {i > 0 && " "}
                                      <span
                                        className={`${
                                          w.confidence < 0.4
                                            ? "underline decoration-wavy decoration-red-400 dark:decoration-red-500"
                                            : w.confidence < 0.7
                                              ? "underline decoration-dotted decoration-yellow-500 dark:decoration-yellow-400"
                                              : ""
                                        }`}
                                        title={`"${w.text}" — ${Math.round(w.confidence * 100)}% confidence`}
                                      >
                                        {w.text}
                                      </span>
                                    </span>
                                  ))
                                : el.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <pre className="flex-1 overflow-auto p-4 text-xs text-[var(--ink-3)] bg-[var(--bg-elev)] whitespace-pre-wrap font-mono leading-relaxed">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
