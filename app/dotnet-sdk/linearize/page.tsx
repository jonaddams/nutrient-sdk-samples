"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { DotNetSampleHeader } from "../_components/DotNetSampleHeader";
import { SamplePicker, type SampleOption } from "../_components/SamplePicker";

const Viewer = dynamic(() => import("../_components/PdfBlobViewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-sm text-gray-400 dark:text-gray-500">
      Loading viewer...
    </div>
  ),
});

const SAMPLES: SampleOption[] = [
  {
    id: "scanned-sample",
    label: "Scanned document",
    subtitle: "4-page scanned PDF.",
    url: "/documents/dotnet-sdk/scanned-sample.pdf",
  },
  {
    id: "wind-in-the-willows",
    label: "The Wind in the Willows",
    subtitle: "Multi-page book — useful when streaming over HTTP.",
    url: "/documents/the-wind-in-the-willows.pdf",
  },
  {
    id: "annual-report",
    label: "Annual report",
    subtitle: "Business document with mixed text and graphics.",
    url: "/documents/annual-report-word.pdf",
  },
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function isLinearized(blob: Blob): Promise<boolean> {
  // The linearization dict lives in the first PDF object, well within the first 2 KB.
  const head = await blob.slice(0, 2048).text();
  return /\/Linearized\b/.test(head);
}

type TabId = "original" | "linearized";

export default function LinearizePage() {
  const [selectedSampleId, setSelectedSampleId] = useState<string>(SAMPLES[0].id);
  const [isRunning, setIsRunning] = useState(false);
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [linearizedBlob, setLinearizedBlob] = useState<Blob | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [linearizedSize, setLinearizedSize] = useState<number | null>(null);
  const [originalFastWebView, setOriginalFastWebView] = useState<boolean | null>(null);
  const [linearizedFastWebView, setLinearizedFastWebView] = useState<boolean | null>(null);
  const [activeTabId, setActiveTabId] = useState<TabId>("linearized");
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const sample = SAMPLES.find((s) => s.id === selectedSampleId)!;
      const sourceResponse = await fetch(sample.url);
      if (!sourceResponse.ok) throw new Error("Failed to load sample");
      const inputBlob = await sourceResponse.blob();

      setOriginalBlob(inputBlob);
      setOriginalSize(inputBlob.size);

      const fileName = sample.url.split("/").pop() ?? "document.pdf";
      const formData = new FormData();
      formData.append("file", new File([inputBlob], fileName, { type: "application/pdf" }));

      const res = await fetch("/api/dotnet-sdk/linearize", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server returned ${res.status} ${res.statusText}`);
      }

      const resultBlob = await res.blob();
      setLinearizedBlob(resultBlob);
      setLinearizedSize(resultBlob.size);

      // Compute fast-web-view status for both blobs
      const [origFwv, linearFwv] = await Promise.all([
        isLinearized(inputBlob),
        isLinearized(resultBlob),
      ]);
      setOriginalFastWebView(origFwv);
      setLinearizedFastWebView(linearFwv);

      setActiveTabId("linearized");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Linearization failed");
      // Keep any previous successful blobs intact
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownload = () => {
    if (!linearizedBlob) return;
    const url = URL.createObjectURL(linearizedBlob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "linearized.pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const showViewer = linearizedBlob !== null;
  const activeBlob = activeTabId === "original" ? originalBlob : linearizedBlob;

  const TABS: { id: TabId; label: string }[] = [
    { id: "original", label: "Original" },
    { id: "linearized", label: "Linearized" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <DotNetSampleHeader
        title="Linearize PDF"
        description="Restructure a PDF for fast web view using the Nutrient .NET SDK. The first page renders before the full file downloads — ideal for HTTP delivery."
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
                {/* Sample picker */}
                <SamplePicker
                  samples={SAMPLES}
                  selectedId={selectedSampleId}
                  onSelect={(id) => {
                    setSelectedSampleId(id);
                    // Clear previous results when switching samples
                    setOriginalBlob(null);
                    setLinearizedBlob(null);
                    setOriginalSize(null);
                    setLinearizedSize(null);
                    setOriginalFastWebView(null);
                    setLinearizedFastWebView(null);
                    setError(null);
                  }}
                  disabled={isRunning}
                />

                {/* Run button */}
                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--digital-pollen)",
                    color: "var(--black)",
                  }}
                >
                  {isRunning ? "Linearizing..." : "Run"}
                </button>

                {/* Error */}
                {error && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                {/* Fast Web View + Size table */}
                {originalSize !== null && linearizedSize !== null && (
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-[#1a1414] border-b border-gray-200 dark:border-gray-700">
                          <th className="text-left px-3 py-2 font-semibold text-gray-500 dark:text-gray-400">
                            Metric
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-500 dark:text-gray-400">
                            Original
                          </th>
                          <th className="text-right px-3 py-2 font-semibold text-gray-500 dark:text-gray-400">
                            Linearized
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-100 dark:border-gray-800">
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            Fast Web View
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {originalFastWebView === null ? (
                              <span className="text-gray-400">—</span>
                            ) : originalFastWebView ? (
                              <span className="text-green-600 dark:text-green-400">Yes</span>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">No</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {linearizedFastWebView === null ? (
                              <span className="text-gray-400">—</span>
                            ) : linearizedFastWebView ? (
                              <span className="text-green-600 dark:text-green-400">Yes</span>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">No</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            Size
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                            {formatBytes(originalSize)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                            {formatBytes(linearizedSize)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Download button */}
                {linearizedBlob && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Download Linearized PDF
                  </button>
                )}

                {/* Description */}
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  Linearization restructures a PDF for fast web view, allowing the
                  first page to render before the entire file downloads. Useful for
                  documents served over HTTP.
                </p>
              </div>
            </div>

            {/* Right Panel — Tab bar + Viewer */}
            <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-12rem)]">
              {isRunning && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60 pointer-events-none">
                  <div className="text-center space-y-2">
                    <div className="inline-block w-6 h-6 border-2 border-[var(--digital-pollen)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Linearizing PDF...
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
                    <p className="text-sm">Run linearize to see the result.</p>
                    <p className="text-xs">
                      Original and linearized PDFs will appear in side-by-side tabs.
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
