"use client";

import { useCallback, useEffect, useState } from "react";
import { JavaSampleHeader } from "../_components/JavaSampleHeader";
import { PdfViewer } from "../_components/PdfViewer";

const API_BASE =
  process.env.NEXT_PUBLIC_JAVA_SDK_API_URL || "http://localhost:8080";

const SAMPLE_FILES = [
  { name: "nda.md", label: "NDA" },
  { name: "project-proposal.md", label: "Project Proposal" },
];

export default function MdToPdfPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [resultBuffer, setResultBuffer] = useState<ArrayBuffer | null>(null);
  const [downloadBytes, setDownloadBytes] = useState<ArrayBuffer | null>(null);
  const [resultSize, setResultSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load sample markdown content
  useEffect(() => {
    setLoading(true);
    fetch(`/documents/${SAMPLE_FILES[selectedIndex].name}`)
      .then((res) => res.text())
      .then((text) => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedIndex]);

  const handleConvert = async () => {
    setProcessing(true);
    setError(null);
    setResultBuffer(null);

    try {
      const blob = new Blob([markdown], { type: "text/markdown" });
      const file = new File([blob], SAMPLE_FILES[selectedIndex].name);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/conversion/md-to-pdf`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const buffer = await res.arrayBuffer();
      setDownloadBytes(buffer.slice(0));
      setResultBuffer(buffer);
      setResultSize(buffer.byteLength);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = useCallback(() => {
    setResultBuffer(null);
    setDownloadBytes(null);
    setResultSize(0);
    setError(null);
  }, []);

  const handleDocumentChange = useCallback((index: number) => {
    setSelectedIndex(index);
    setResultBuffer(null);
    setDownloadBytes(null);
    setResultSize(0);
    setError(null);
  }, []);

  const handleDownload = () => {
    if (!downloadBytes) return;
    const blob = new Blob([downloadBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "converted.pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <JavaSampleHeader
        title="Markdown to PDF"
        description="Convert Markdown documents to PDF using the Nutrient Java SDK. Edit the source before converting."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-[var(--bg-elev)] rounded-xl shadow-lg border border-[var(--line)] overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel — Editor */}
            <div className="w-1/2 border-r border-[var(--line)] bg-[var(--bg-elev)] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--line)] flex items-center gap-3">
                <select
                  value={selectedIndex}
                  onChange={(e) => handleDocumentChange(Number(e.target.value))}
                  className="flex-1 px-2 py-1.5 text-sm border border-[var(--line-strong)] rounded-md bg-[var(--bg-elev)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {SAMPLE_FILES.map((file, i) => (
                    <option key={file.name} value={i}>
                      {file.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={processing || loading}
                  className="px-4 py-1.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                  }}
                >
                  {processing ? "Converting..." : "Convert to PDF"}
                </button>

                {downloadBytes && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer border border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface)] whitespace-nowrap"
                  >
                    Download ({(resultSize / 1024).toFixed(1)} KB)
                  </button>
                )}
              </div>

              {/* Markdown Editor */}
              <textarea
                value={markdown}
                onChange={(e) => setMarkdown(e.target.value)}
                disabled={loading}
                spellCheck={false}
                className="flex-1 w-full p-4 text-sm font-mono leading-relaxed bg-[var(--bg-elev)] text-gray-800 dark:text-gray-200 border-0 outline-none resize-none placeholder:text-gray-400"
                placeholder={loading ? "Loading..." : "Enter Markdown here..."}
              />
            </div>

            {/* Right Panel — PDF Viewer */}
            <div className="flex-1 min-w-0 relative">
              {error && (
                <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-[color-mix(in_srgb,var(--code-coral)_12%,var(--bg-elev))] border-b border-[color-mix(in_srgb,var(--code-coral)_35%,var(--line))] text-[var(--code-coral)] text-sm">
                  {error}
                </div>
              )}

              {processing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60">
                  <div className="text-center space-y-2">
                    <div className="inline-block w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[var(--ink-3)]">
                      Converting to PDF...
                    </p>
                  </div>
                </div>
              )}

              {!resultBuffer && !processing && !error && (
                <div className="flex-1 h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                  <div className="text-center space-y-2">
                    <p className="text-sm">
                      Edit the Markdown and click &quot;Convert to PDF&quot;
                    </p>
                    <p className="text-xs">
                      The converted PDF will be displayed here
                    </p>
                  </div>
                </div>
              )}

              {resultBuffer && (
                <>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute top-3 right-3 z-10 px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--line-strong)] text-[var(--ink-2)] bg-[var(--bg-elev)] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                  <PdfViewer document={resultBuffer} />
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
