"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";
import { ExtractionResultPanel } from "../_components/ExtractionResultPanel";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";

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
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<MarkdownResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = SAMPLE_DOCUMENTS[selectedIndex];

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(selected.path);
      const blob = await response.blob();
      const file = new File([blob], selected.filename);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${API_BASE}/api/extraction/markdown?provider=claude`,
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
      setResult((await res.json()) as MarkdownResult);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Markdown extraction failed",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${selected.filename.replace(/\.[^.]+$/, "")}.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const formatted = useMemo(
    () => (
      <div className="p-4 max-w-none text-[var(--ink-2)] [&_table]:border-collapse [&_td]:border [&_td]:border-[var(--line)] [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-[var(--line)] [&_th]:px-2 [&_th]:py-1">
        {result && (
          <>
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
          </>
        )}
      </div>
    ),
    [result],
  );

  const raw = useMemo(
    () => (
      <pre className="p-4 text-xs text-[var(--ink-3)] whitespace-pre-wrap font-mono leading-relaxed">
        {result?.markdown ?? ""}
      </pre>
    ),
    [result],
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PythonSampleHeader
        title="Document to Markdown"
        description="Convert a complex document to clean Markdown for RAG and LLM ingestion pipelines, via VLM-enhanced extraction with Claude."
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
                    setResult(null);
                    setError(null);
                  }}
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
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {processing ? "Converting..." : "Convert to Markdown"}
                </button>
                {error && (
                  <div className="p-3 bg-[color-mix(in_srgb,var(--code-coral)_12%,var(--bg-elev))] rounded-md text-[var(--code-coral)] text-xs">
                    {error}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className={`relative ${result ? "h-[55%]" : "flex-1"}`}>
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
              {result && (
                <div className="border-t border-[var(--line)] h-[45%]">
                  <ExtractionResultPanel
                    title="Markdown Output"
                    stats={`${result.charCount.toLocaleString()} characters`}
                    primaryLabel="Rendered"
                    primary={formatted}
                    secondaryLabel="Markdown"
                    secondary={raw}
                    onDownload={handleDownload}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
