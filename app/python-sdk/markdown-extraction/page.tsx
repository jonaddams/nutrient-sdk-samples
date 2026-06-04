"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";
import { ExtractionResultPanel } from "../_components/ExtractionResultPanel";
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
    label: "USENIX Example Paper",
    path: "/documents/usenix-example-paper.pdf",
    filename: "usenix-example-paper.pdf",
  },
];

interface MarkdownResult {
  engine: string;
  filename: string;
  provider: string;
  markdown: string;
  charCount: number;
}

export default function MarkdownExtractionPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mode, setMode] = useState<ProviderMode>("claude");
  const {
    runAll,
    loading: processing,
    outcomes,
    reset,
  } = useProviderRun<MarkdownResult>();
  const entries = outcomeEntries(outcomes);

  const selected = SAMPLE_DOCUMENTS[selectedIndex];

  const handleProcess = () =>
    runAll(mode, async (provider: Provider) => {
      const response = await fetch(selected.path);
      const blob = await response.blob();
      const file = new File([blob], selected.filename);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${API_BASE}/api/extraction/markdown?provider=${provider}`,
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
      return (await res.json()) as MarkdownResult;
    });

  const handleDownload = (provider: Provider, result: MarkdownResult) => {
    const blob = new Blob([result.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${selected.filename.replace(/\.[^.]+$/, "")}-${provider}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const renderFormatted = (result: MarkdownResult) => (
    <div className="p-4 max-w-none text-[var(--ink-2)] [&_table]:border-collapse [&_td]:border [&_td]:border-[var(--line)] [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-[var(--line)] [&_th]:px-2 [&_th]:py-1">
      {/* rehype-raw parses the embedded HTML tables the SDK emits in its Markdown;
          rehype-sanitize (after raw) strips scripts and event-handler attributes so a
          malicious/uploaded document transcribed by the VLM cannot inject active HTML.
          The default sanitize schema still permits table/thead/tr/td/th. */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
      >
        {result.markdown}
      </ReactMarkdown>
    </div>
  );

  const renderRaw = (result: MarkdownResult) => (
    <pre className="p-4 text-xs text-[var(--ink-3)] whitespace-pre-wrap font-mono leading-relaxed">
      {result.markdown}
    </pre>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PythonSampleHeader
        title="Document to Markdown"
        description="Convert a complex document to clean Markdown for RAG and LLM ingestion pipelines, via VLM-enhanced extraction with Claude or OpenAI."
      />
      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-[var(--bg-elev)] rounded-xl shadow-lg border border-[var(--line)] overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            <div className="w-80 border-r border-[var(--line)] bg-[var(--bg-elev)] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--line)]">
                <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                  Source Document
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <select
                  aria-label="Source document"
                  value={selectedIndex}
                  onChange={(e) => {
                    setSelectedIndex(Number(e.target.value));
                    reset();
                  }}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--line-strong)] bg-[var(--bg-elev)] text-[var(--ink)]"
                >
                  {SAMPLE_DOCUMENTS.map((doc, i) => (
                    <option key={doc.path} value={i}>
                      {doc.label}
                    </option>
                  ))}
                </select>
                <ProviderToggle
                  value={mode}
                  onChange={setMode}
                  disabled={processing}
                />
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={processing}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {processing ? "Converting..." : "Convert to Markdown"}
                </button>
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div
                className={`relative ${entries.length > 0 ? "h-[55%]" : "flex-1"}`}
              >
                {processing && (
                  <div
                    role="status"
                    aria-label="Converting to Markdown, please wait"
                    className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60"
                  >
                    <div className="text-center space-y-2">
                      <div className="inline-block w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-[var(--ink-3)]">
                        Converting to Markdown...
                      </p>
                    </div>
                  </div>
                )}
                <PdfViewer document={selected.path} />
              </div>
              {entries.length > 0 && (
                <div className="border-t border-[var(--line)] h-[45%] flex flex-col lg:flex-row">
                  {entries.map(([provider, outcome]) => (
                    <div
                      key={provider}
                      className="flex-1 min-w-0 min-h-0 border-b lg:border-b-0 lg:border-r last:border-0 border-[var(--line)]"
                    >
                      {outcome.status === "ok" ? (
                        <ExtractionResultPanel
                          title="Markdown Output"
                          stats={`${PROVIDER_LABELS[provider]} · ${formatTiming(outcome.ms)} | ${outcome.data.charCount.toLocaleString()} characters`}
                          primaryLabel="Rendered"
                          primary={renderFormatted(outcome.data)}
                          secondaryLabel="Markdown"
                          secondary={renderRaw(outcome.data)}
                          onDownload={() =>
                            handleDownload(provider, outcome.data)
                          }
                        />
                      ) : (
                        <ProviderErrorCard
                          provider={provider}
                          message={outcome.message}
                        />
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
