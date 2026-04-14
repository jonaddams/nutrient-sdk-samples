"use client";

import { useCallback, useState } from "react";
import { JavaSampleHeader } from "../_components/JavaSampleHeader";
import { PdfViewer } from "../_components/PdfViewer";

const API_BASE =
  process.env.NEXT_PUBLIC_JAVA_SDK_API_URL || "http://localhost:8080";

const SAMPLE_FILES = [
  {
    name: "executive-business-plan.docx",
    label: "Word — Executive Business Plan",
    path: "/documents/executive-business-plan.docx",
    endpoint: "/api/conversion/docx-to-pdf",
  },
  {
    name: "invoice.xlsx",
    label: "Excel — Invoice",
    path: "/documents/invoice.xlsx",
    endpoint: "/api/conversion/xlsx-to-pdf",
  },
  {
    name: "fashion.pptx",
    label: "PowerPoint — Fashion",
    path: "/documents/fashion.pptx",
    endpoint: "/api/conversion/pptx-to-pdf",
  },
];

export default function OfficeToPdfPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [resultBuffer, setResultBuffer] = useState<ArrayBuffer | null>(null);
  const [downloadBytes, setDownloadBytes] = useState<ArrayBuffer | null>(null);
  const [resultSize, setResultSize] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleConvert = async () => {
    setProcessing(true);
    setError(null);
    setResultBuffer(null);

    try {
      const sample = SAMPLE_FILES[selectedIndex];
      const response = await fetch(sample.path);
      const blob = await response.blob();
      const file = new File([blob], sample.name);
      const endpoint = sample.endpoint;

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}${endpoint}`, {
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
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <JavaSampleHeader
        title="Office to PDF"
        description="Convert Word, Excel, and PowerPoint documents to PDF using the Nutrient Java SDK."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel — Controls */}
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--warm-gray-400)] flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Source Document
                </h3>

                <select
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#1a1414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)]"
                >
                  {SAMPLE_FILES.map((file, i) => (
                    <option key={file.name} value={i}>
                      {file.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div className="p-4 space-y-2">
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={processing}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--digital-pollen)",
                    color: "var(--black)",
                  }}
                >
                  {processing ? "Converting..." : "Convert to PDF"}
                </button>

                {downloadBytes && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Download PDF ({(resultSize / 1024).toFixed(1)} KB)
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer text-[var(--digital-pollen)] border border-[var(--digital-pollen)] bg-transparent hover:bg-[var(--digital-pollen)] hover:text-[var(--black)]"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Panel — Viewer */}
            <div className="flex-1 min-w-0 relative">
              {error && (
                <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}

              {processing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60">
                  <div className="text-center space-y-2">
                    <div className="inline-block w-6 h-6 border-2 border-[var(--digital-pollen)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Converting to PDF...
                    </p>
                  </div>
                </div>
              )}

              {!resultBuffer && !processing && !error && (
                <div className="flex-1 h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                  <div className="text-center space-y-2">
                    <p className="text-sm">
                      Select a document and click &quot;Convert to PDF&quot;
                    </p>
                    <p className="text-xs">
                      The converted PDF will be displayed here
                    </p>
                  </div>
                </div>
              )}

              {resultBuffer && <PdfViewer document={resultBuffer} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
