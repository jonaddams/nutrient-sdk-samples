"use client";

import { useCallback, useState } from "react";
import { DotNetSampleHeader } from "../_components/DotNetSampleHeader";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";

const SAMPLE_FILE = {
  name: "scanned-sample.pdf",
  path: "/documents/dotnet-sdk/scanned-sample.pdf",
};

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}

type Level = "low" | "medium" | "high";

export default function OptimizePage() {
  const [useCustomFile, setUseCustomFile] = useState(false);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>("medium");
  const [processing, setProcessing] = useState(false);
  const [resultBuffer, setResultBuffer] = useState<ArrayBuffer | null>(null);
  const [downloadBytes, setDownloadBytes] = useState<ArrayBuffer | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [resultSize, setResultSize] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    setProcessing(true);
    setError(null);
    setResultBuffer(null);
    setDownloadBytes(null);
    setOriginalSize(0);
    setResultSize(0);

    try {
      let file: File;
      if (useCustomFile && customFile) {
        file = customFile;
      } else {
        const response = await fetch(SAMPLE_FILE.path);
        const blob = await response.blob();
        file = new File([blob], SAMPLE_FILE.name, { type: "application/pdf" });
      }

      setOriginalSize(file.size);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/dotnet-sdk/optimize?level=${level}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(
          text || `Server returned ${res.status} ${res.statusText}`,
        );
      }

      const buffer = await res.arrayBuffer();
      setDownloadBytes(buffer.slice(0));
      setResultBuffer(buffer);
      setResultSize(buffer.byteLength);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleClear = useCallback(() => {
    setResultBuffer(null);
    setDownloadBytes(null);
    setOriginalSize(0);
    setResultSize(0);
    setError(null);
  }, []);

  const handleDownload = () => {
    if (!downloadBytes) return;
    const blob = new Blob([downloadBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "optimized.pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const savingsPercent =
    originalSize > 0 && resultSize > 0
      ? Math.round(((originalSize - resultSize) / originalSize) * 100)
      : null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <DotNetSampleHeader
        title="Optimize PDF"
        description="Compress a PDF using the Nutrient .NET SDK. Especially effective on scanned/image-heavy documents using MRC compression."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel — Controls */}
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--warm-gray-400)]">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Input Document
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* File source toggle */}
                <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#1a1414] rounded-lg">
                  <button
                    type="button"
                    onClick={() => setUseCustomFile(false)}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      !useCustomFile
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Sample File
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomFile(true)}
                    className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      useCustomFile
                        ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    Upload File
                  </button>
                </div>

                {useCustomFile ? (
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) =>
                      setCustomFile(e.target.files?.[0] ?? null)
                    }
                    className="w-full text-sm text-gray-600 dark:text-gray-400"
                  />
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1414] rounded-md p-3">
                    <span className="font-mono text-xs">
                      {SAMPLE_FILE.name}
                    </span>
                    <p className="mt-1 text-xs opacity-70">
                      Scanned-style rasterized PDF — ideal for MRC compression
                    </p>
                  </div>
                )}

                {/* Level selector */}
                <div>
                  <label
                    htmlFor="level"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Compression Level
                  </label>
                  <select
                    id="level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value as Level)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#1a1414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium (default)</option>
                    <option value="high">High</option>
                  </select>
                </div>

                {/* Optimize button */}
                <button
                  type="button"
                  onClick={handleOptimize}
                  disabled={processing || (useCustomFile && !customFile)}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--digital-pollen)",
                    color: "var(--black)",
                  }}
                >
                  {processing ? "Optimizing..." : "Optimize PDF"}
                </button>

                {/* Size summary */}
                {resultSize > 0 && originalSize > 0 && (
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 p-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Original</span>
                      <span>{formatBytes(originalSize)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Optimized</span>
                      <span>{formatBytes(resultSize)}</span>
                    </div>
                    {savingsPercent !== null && (
                      <div
                        className={`flex justify-between text-xs font-semibold ${
                          savingsPercent > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-500"
                        }`}
                      >
                        <span>Savings</span>
                        <span>
                          {savingsPercent > 0
                            ? `${savingsPercent}%`
                            : "No reduction"}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Download button */}
                {downloadBytes && (
                  <>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Download Optimized PDF
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
                      Optimizing PDF...
                    </p>
                  </div>
                </div>
              )}

              {!resultBuffer && !processing && !error && (
                <div className="flex-1 h-full flex items-center justify-center text-gray-400 dark:text-gray-600">
                  <div className="text-center space-y-2">
                    <p className="text-sm">
                      Choose a file and click &quot;Optimize PDF&quot;
                    </p>
                    <p className="text-xs">
                      The optimized PDF will be displayed here
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
