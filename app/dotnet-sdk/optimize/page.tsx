"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { DotNetSampleHeader } from "../_components/DotNetSampleHeader";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-gray-500">
      Loading viewer...
    </div>
  ),
});

const SAMPLE_FILE = {
  name: "scanned-sample.pdf",
  path: "/documents/dotnet-sdk/scanned-sample.pdf",
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function percentSaved(before: number, after: number): string {
  if (before <= 0) return "—";
  const pct = Math.round(((before - after) / before) * 100);
  return `${Math.max(0, pct)}%`;
}

type Level = "low" | "medium" | "high";
type TabId = "original" | "optimized";

export default function OptimizePage() {
  const [useCustomFile, setUseCustomFile] = useState(false);
  const [customFile, setCustomFile] = useState<File | null>(null);
  const [level, setLevel] = useState<Level>("medium");
  const [isRunning, setIsRunning] = useState(false);
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [optimizedBlob, setOptimizedBlob] = useState<Blob | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [optimizedSize, setOptimizedSize] = useState<number | null>(null);
  const [activeTabId, setActiveTabId] = useState<TabId>("optimized");
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);

    try {
      let inputBlob: Blob;
      if (useCustomFile && customFile) {
        inputBlob = customFile;
      } else {
        const res = await fetch(SAMPLE_FILE.path);
        if (!res.ok) throw new Error(`Failed to fetch sample file: ${res.status}`);
        inputBlob = await res.blob();
      }

      setOriginalBlob(inputBlob);
      setOriginalSize(inputBlob.size);

      const formData = new FormData();
      formData.append(
        "file",
        useCustomFile && customFile
          ? customFile
          : new File([inputBlob], SAMPLE_FILE.name, { type: "application/pdf" }),
      );

      const res = await fetch(`/api/dotnet-sdk/optimize?level=${level}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server returned ${res.status} ${res.statusText}`);
      }

      const resultBlob = await res.blob();
      setOptimizedBlob(resultBlob);
      setOptimizedSize(resultBlob.size);
      setActiveTabId("optimized");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Optimization failed");
      // Keep any previous successful blobs intact
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownload = () => {
    if (!optimizedBlob) return;
    const url = URL.createObjectURL(optimizedBlob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "optimized.pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const showViewer = optimizedBlob !== null;
  const activeBlob = activeTabId === "original" ? originalBlob : optimizedBlob;

  const TABS: { id: TabId; label: string }[] = [
    { id: "original", label: "Original" },
    { id: "optimized", label: "Optimized" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <DotNetSampleHeader
        title="Optimize PDF"
        description="Compress a PDF using the Nutrient .NET SDK. Especially effective on scanned/image-heavy documents using MRC compression."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex">
            {/* Left Panel — Controls */}
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0 min-h-[calc(100vh-12rem)]">
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
                    onChange={(e) => setCustomFile(e.target.files?.[0] ?? null)}
                    className="w-full text-sm text-gray-600 dark:text-gray-400"
                  />
                ) : (
                  <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1414] rounded-md p-3">
                    <span className="font-mono text-xs">{SAMPLE_FILE.name}</span>
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

                {/* Run button */}
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isRunning || (useCustomFile && !customFile)}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--digital-pollen)",
                    color: "var(--black)",
                  }}
                >
                  {isRunning ? "Optimizing..." : "Run"}
                </button>

                {/* Error */}
                {error && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                {/* Size comparison table */}
                {originalSize !== null && optimizedSize !== null && (
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-[#1a1414] border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left px-3 py-2 font-semibold text-gray-500 dark:text-gray-400">
                            Metric
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-500 dark:text-gray-400">
                            Size
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            Original
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                            {formatBytes(originalSize)}
                          </td>
                        </tr>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            Optimized
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                            {formatBytes(optimizedSize)}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-300">
                            Saved
                          </td>
                          <td
                            className={`px-3 py-2 text-right font-semibold font-mono ${
                              optimizedSize < originalSize
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {percentSaved(originalSize, optimizedSize)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Download button */}
                {optimizedBlob && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Download Optimized PDF
                  </button>
                )}
              </div>
            </div>

            {/* Right Panel — Tab bar + Viewer */}
            <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-12rem)]">
              {isRunning && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60 pointer-events-none">
                  <div className="text-center space-y-2">
                    <div className="inline-block w-6 h-6 border-2 border-[var(--digital-pollen)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Optimizing PDF...
                    </p>
                  </div>
                </div>
              )}

              {showViewer ? (
                <>
                  {/* Tab bar */}
                  <div className="flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2a2020] overflow-x-auto flex-shrink-0">
                    {TABS.map((tab) => (
                      <div
                        key={tab.id}
                        className={
                          "flex items-center px-4 py-2.5 text-sm border-r border-gray-200 dark:border-gray-700 cursor-pointer transition-colors " +
                          (tab.id === activeTabId
                            ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-medium"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1a1414]")
                        }
                      >
                        <button
                          type="button"
                          onClick={() => setActiveTabId(tab.id)}
                          className="cursor-pointer"
                        >
                          {tab.label}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Viewer */}
                  <div className="flex-1 min-h-0">
                    {activeBlob && (
                      <Viewer key={activeTabId} blob={activeBlob} />
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600">
                  <div className="text-center space-y-2">
                    <p className="text-sm">Run optimize to see the result.</p>
                    <p className="text-xs">
                      Original and optimized PDFs will appear in side-by-side tabs.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
