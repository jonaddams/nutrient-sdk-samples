"use client";

import { useCallback, useState } from "react";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL || "http://localhost:8080";

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
      <PythonSampleHeader
        title="PDF to Office"
        description="Convert PDF documents to Word and Excel formats using the Nutrient Python SDK."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--warm-gray-400)] flex flex-col gap-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Source Document
                </h3>
                <select
                  value={selectedIndex}
                  onChange={(e) => handleSelectChange(Number(e.target.value))}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#1a1414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)]"
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
                    background: "var(--digital-pollen)",
                    color: "var(--black)",
                  }}
                >
                  {processing ? "Converting..." : "Convert"}
                </button>

                {downloadBytes && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Download {sample.outputName} (
                      {(resultSize / 1024).toFixed(1)} KB)
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
                      Converting...
                    </p>
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
