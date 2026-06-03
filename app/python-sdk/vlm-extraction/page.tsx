"use client";

import { useCallback, useState } from "react";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";
import { ProviderErrorCard } from "../_components/ProviderErrorCard";
import { ProviderToggle } from "../_components/ProviderToggle";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";
import {
  formatTiming,
  outcomeEntries,
  PROVIDER_LABELS,
  type Provider,
  type ProviderMode,
} from "../_components/providers";
import { useProviderRun } from "../_components/useProviderRun";

const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL || "http://localhost:8080";

const SAMPLE_DOCUMENTS = [
  {
    label: "Sakura Design Studio Invoice (SD-2025-0041)",
    path: "/invoices/Invoice SD-2025-0041.pdf",
    filename: "Invoice SD-2025-0041.pdf",
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
  const [mode, setMode] = useState<ProviderMode>("claude");
  const [resultExpanded, setResultExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("formatted");
  const {
    runAll,
    loading: processing,
    outcomes,
    reset,
  } = useProviderRun<ExtractionResult>();
  const entries = outcomeEntries(outcomes);

  const selected = SAMPLE_DOCUMENTS[selectedIndex] as {
    label: string;
    path: string;
    filename: string;
  };

  const handleProcess = () => {
    setResultExpanded(false);
    return runAll(mode, async (provider: Provider) => {
      const response = await fetch(selected.path);
      const blob = await response.blob();
      const file = new File([blob], selected.filename);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${API_BASE}/api/extraction/vlm?provider=${provider}`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!res.ok) {
        const detail = await res
          .json()
          .then((b) => (typeof b?.detail === "string" ? b.detail : null))
          .catch(() => null);
        throw new Error(detail ?? `API returned ${res.status}`);
      }

      return (await res.json()) as ExtractionResult;
    });
  };

  const handleDocumentChange = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      reset();
      setResultExpanded(false);
    },
    [reset],
  );

  const handleDownload = (provider: Provider, result: ExtractionResult) => {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${selected.filename.replace(/\.[^.]+$/, "")}-vlm-${provider}.json`;
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
        description="Extract structured content from documents that don't have native form fields. Calls VLM-enhanced ICR with Claude or OpenAI live against the deployed backend — no localhost VLM required."
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

                <ProviderToggle value={mode} onChange={setMode} disabled={processing} />

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
              </div>
            </div>

            {/* Right Panel — Viewer + Results */}
            <div className="flex-1 min-w-0 flex flex-col">
              {/* Viewer */}
              <div
                className={`relative ${entries.length > 0 && !resultExpanded ? "h-[55%]" : "flex-1"} ${resultExpanded && entries.length > 0 ? "hidden" : ""}`}
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
              {entries.length > 0 && (
                <div
                  className={`border-t border-[var(--line)] flex flex-col lg:flex-row ${resultExpanded ? "flex-1" : "h-[45%]"}`}
                >
                  {entries.map(([provider, outcome]) => (
                    <div
                      key={provider}
                      className="flex-1 min-w-0 min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r last:border-0 border-[var(--line)]"
                    >
                      {outcome.status === "error" ? (
                        <ProviderErrorCard
                          provider={provider}
                          message={outcome.message}
                        />
                      ) : (
                        <>
                          <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--line)] flex-shrink-0">
                            <div className="flex items-center gap-3">
                              <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                                Extracted Content
                              </h3>
                              <span className="text-xs text-[var(--ink-3)]">
                                {PROVIDER_LABELS[provider]} ·{" "}
                                {formatTiming(outcome.ms)}
                                {" | "}
                                {outcome.data.statistics.textElements} text
                                regions
                                {" | "}
                                <span
                                  className={confidenceColor(
                                    outcome.data.statistics.averageConfidence,
                                  )}
                                >
                                  {Math.round(
                                    outcome.data.statistics.averageConfidence *
                                      100,
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
                                onClick={() =>
                                  handleDownload(provider, outcome.data)
                                }
                                className="px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                              >
                                Download
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setResultExpanded(!resultExpanded)
                                }
                                className="px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
                              >
                                {resultExpanded ? "Collapse" : "Expand"}
                              </button>
                            </div>
                          </div>

                          {viewMode === "formatted" ? (
                            <div className="flex-1 overflow-auto p-4 bg-[var(--bg-elev)] space-y-3">
                              {outcome.data.textElements.map((el, idx) => (
                                <div
                                  key={`${idx}-${el.readingOrder}`}
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
                                            // biome-ignore lint/suspicious/noArrayIndexKey: words are positional
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
                              {JSON.stringify(outcome.data, null, 2)}
                            </pre>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
