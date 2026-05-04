"use client";

import { useCallback, useState } from "react";
import { JavaSampleHeader } from "../_components/JavaSampleHeader";
import { PdfViewer } from "../_components/PdfViewer";

const API_BASE =
  process.env.NEXT_PUBLIC_JAVA_SDK_API_URL || "http://localhost:8080";

const SAMPLE_FILES = [
  {
    name: "executive-business-plan-docx.pdf",
    label: "Executive Business Plan → Word",
    path: "/documents/executive-business-plan-docx.pdf",
    endpoint: "/api/conversion/pdf-to-docx",
    outputName: "executive-business-plan.docx",
  },
  {
    name: "elegant-embrace-excel.pdf",
    label: "Elegant Embrace → Excel",
    path: "/documents/elegant-embrace-excel.pdf",
    endpoint: "/api/conversion/pdf-to-xlsx",
    outputName: "elegant-embrace.xlsx",
  },
];

export default function PdfToOfficePage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [downloadBytes, setDownloadBytes] = useState<ArrayBuffer | null>(null);
  const [resultSize, setResultSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const sample = SAMPLE_FILES[selectedIndex];

  const handleConvert = async () => {
    setProcessing(true);
    setError(null);
    setDownloadBytes(null);

    try {
      const response = await fetch(sample.path);
      const blob = await response.blob();
      const file = new File([blob], sample.name);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}${sample.endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const buffer = await res.arrayBuffer();
      setDownloadBytes(buffer);
      setResultSize(buffer.byteLength);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = useCallback(() => {
    setDownloadBytes(null);
    setResultSize(0);
    setError(null);
  }, []);

  const handleDownload = () => {
    if (!downloadBytes) return;
    const blob = new Blob([downloadBytes], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = sample.outputName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleSelectChange = (index: number) => {
    setSelectedIndex(index);
    setDownloadBytes(null);
    setResultSize(0);
    setError(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <JavaSampleHeader
        title="PDF to Office"
        description="Convert PDF documents to Word and Excel formats using the Nutrient Java SDK."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-[var(--bg-elev)] rounded-xl shadow-lg border border-[var(--line)] overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel */}
            <div className="w-80 border-r border-[var(--line)] bg-[var(--bg-elev)] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--line)] flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                  Source Document
                </h3>
                <select
                  value={selectedIndex}
                  onChange={(e) => handleSelectChange(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border border-[var(--line-strong)] rounded-md bg-[var(--bg-elev)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {SAMPLE_FILES.map((file, i) => (
                    <option key={file.name} value={i}>
                      {file.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-4 space-y-2">
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={processing}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                  }}
                >
                  {processing ? "Converting..." : "Convert"}
                </button>

                {downloadBytes && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface)]"
                    >
                      Download {sample.outputName} (
                      {(resultSize / 1024).toFixed(1)} KB)
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer text-[var(--accent)] border border-[var(--accent)] bg-transparent hover:bg-[var(--accent)] hover:text-white"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Panel — Source PDF Viewer */}
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
                    <p className="text-sm text-[var(--ink-3)]">Converting...</p>
                  </div>
                </div>
              )}

              <PdfViewer document={sample.path} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
