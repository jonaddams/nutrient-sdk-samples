"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { DotNetSampleHeader } from "../_components/DotNetSampleHeader";
import { SamplePicker, type SampleOption } from "../_components/SamplePicker";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center h-full text-sm"
      style={{ color: "var(--ink-4)" }}
    >
      Loading viewer...
    </div>
  ),
});

const SAMPLES: SampleOption[] = [
  {
    id: "scanned-sample",
    label: "Scanned document",
    subtitle: "Rasterized 4-page PDF — best case for MRC compression.",
    url: "/documents/dotnet-sdk/scanned-sample.pdf",
  },
  {
    id: "cookies-recipe",
    label: "Jacques Torres cookies recipe",
    subtitle: "Image-heavy recipe PDF — shows photo recompression.",
    url: "/documents/jacques-torres-chocolate-chip-cookies-recipe.pdf",
  },
  {
    id: "usenix-paper",
    label: "USENIX example paper",
    subtitle:
      "Vector text document — shows minimal savings (already efficient).",
    url: "/documents/usenix-example-paper.pdf",
  },
];

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

const cardStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-3)",
  overflow: "hidden",
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  color: "var(--ink)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-2)",
};

export default function OptimizePage() {
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    SAMPLES[0].id,
  );
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
      const sample = SAMPLES.find((s) => s.id === selectedSampleId)!;
      const sourceResponse = await fetch(sample.url);
      if (!sourceResponse.ok) throw new Error("Failed to load sample");
      const sourceBlob = await sourceResponse.blob();

      setOriginalBlob(sourceBlob);
      setOriginalSize(sourceBlob.size);

      const fileName = sample.url.split("/").pop() ?? "document.pdf";
      const formData = new FormData();
      formData.append(
        "file",
        new File([sourceBlob], fileName, { type: "application/pdf" }),
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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <DotNetSampleHeader
        title="Optimize PDF"
        description="Compress a PDF using the Nutrient .NET SDK. Especially effective on scanned/image-heavy documents using MRC compression."
      />

      <main
        className="shell"
        style={{
          paddingTop: "var(--space-6)",
          paddingBottom: "var(--space-8)",
        }}
      >
        <div style={cardStyle}>
          <div className="flex">
            {/* Left Panel — Controls */}
            <div
              className="w-80 flex flex-col shrink-0 min-h-[calc(100vh-12rem)]"
              style={{
                background: "var(--surface)",
                borderRight: "1px solid var(--line)",
              }}
            >
              <div
                className="p-4"
                style={{ borderBottom: "1px solid var(--line)" }}
              >
                <h3
                  className="text-sm font-semibold"
                  style={{ color: "var(--ink)" }}
                >
                  Input Document
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <SamplePicker
                  samples={SAMPLES}
                  selectedId={selectedSampleId}
                  onSelect={(id) => {
                    setSelectedSampleId(id);
                    setOriginalBlob(null);
                    setOptimizedBlob(null);
                    setOriginalSize(null);
                    setOptimizedSize(null);
                    setError(null);
                  }}
                  disabled={isRunning}
                />

                <div>
                  <label
                    htmlFor="level"
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--ink-2)" }}
                  >
                    Compression Level
                  </label>
                  <select
                    id="level"
                    value={level}
                    onChange={(e) => setLevel(e.target.value as Level)}
                    className="w-full px-2 py-1.5 text-sm focus:outline-none"
                    style={inputStyle}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium (default)</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="btn btn-sm w-full"
                >
                  {isRunning ? "Optimizing..." : "Run"}
                </button>

                {error && (
                  <div
                    className="p-3 text-xs"
                    style={{
                      background:
                        "color-mix(in srgb, var(--code-coral) 12%, var(--bg-elev))",
                      border:
                        "1px solid color-mix(in srgb, var(--code-coral) 35%, var(--line))",
                      borderRadius: "var(--r-2)",
                      color: "var(--code-coral)",
                    }}
                  >
                    {error}
                  </div>
                )}

                {originalSize !== null && optimizedSize !== null && (
                  <div
                    className="overflow-hidden"
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-2)",
                    }}
                  >
                    <table className="w-full text-xs">
                      <thead>
                        <tr
                          style={{
                            background: "var(--surface)",
                            borderBottom: "1px solid var(--line)",
                          }}
                        >
                          <th
                            className="text-left px-3 py-2 font-semibold"
                            style={{ color: "var(--ink-3)" }}
                          >
                            Metric
                          </th>
                          <th
                            className="text-right px-3 py-2 font-semibold"
                            style={{ color: "var(--ink-3)" }}
                          >
                            Size
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: "1px solid var(--line)" }}>
                          <td
                            className="px-3 py-2"
                            style={{ color: "var(--ink-3)" }}
                          >
                            Original
                          </td>
                          <td
                            className="px-3 py-2 text-right font-mono"
                            style={{ color: "var(--ink-2)" }}
                          >
                            {formatBytes(originalSize)}
                          </td>
                        </tr>
                        <tr style={{ borderBottom: "1px solid var(--line)" }}>
                          <td
                            className="px-3 py-2"
                            style={{ color: "var(--ink-3)" }}
                          >
                            Optimized
                          </td>
                          <td
                            className="px-3 py-2 text-right font-mono"
                            style={{ color: "var(--ink-2)" }}
                          >
                            {formatBytes(optimizedSize)}
                          </td>
                        </tr>
                        <tr>
                          <td
                            className="px-3 py-2 font-semibold"
                            style={{ color: "var(--ink-2)" }}
                          >
                            Saved
                          </td>
                          <td
                            className="px-3 py-2 text-right font-semibold font-mono"
                            style={{
                              color:
                                optimizedSize < originalSize
                                  ? "var(--data-green)"
                                  : "var(--ink-3)",
                            }}
                          >
                            {percentSaved(originalSize, optimizedSize)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {optimizedBlob && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="btn ghost btn-sm w-full"
                  >
                    Download Optimized PDF
                  </button>
                )}
              </div>
            </div>

            {/* Right Panel — Tab bar + Viewer */}
            <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-12rem)] relative">
              {isRunning && (
                <div
                  className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none"
                  style={{
                    background:
                      "color-mix(in srgb, var(--bg) 70%, transparent)",
                  }}
                >
                  <div className="text-center space-y-2">
                    <div
                      className="inline-block w-6 h-6 rounded-full animate-spin"
                      style={{
                        border: "2px solid var(--line)",
                        borderTopColor: "var(--accent)",
                      }}
                    />
                    <p
                      className="text-sm"
                      style={{ color: "var(--ink-3)" }}
                    >
                      Optimizing PDF...
                    </p>
                  </div>
                </div>
              )}

              {showViewer ? (
                <>
                  <div
                    className="flex items-center overflow-x-auto shrink-0"
                    style={{
                      background: "var(--surface)",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    {TABS.map((tab) => {
                      const isActive = tab.id === activeTabId;
                      return (
                        <div
                          key={tab.id}
                          className="flex items-center px-4 py-2.5 text-sm cursor-pointer transition-colors"
                          style={{
                            background: isActive
                              ? "var(--bg-elev)"
                              : "transparent",
                            color: isActive ? "var(--ink)" : "var(--ink-3)",
                            fontWeight: isActive ? 500 : 400,
                            borderRight: "1px solid var(--line)",
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background =
                                "var(--accent-tint)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.background = "transparent";
                            }
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setActiveTabId(tab.id)}
                            className="cursor-pointer"
                          >
                            {tab.label}
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex-1 min-h-0">
                    {activeBlob && (
                      <Viewer key={activeTabId} blob={activeBlob} />
                    )}
                  </div>
                </>
              ) : (
                <div
                  className="flex-1 flex items-center justify-center"
                  style={{ color: "var(--ink-4)" }}
                >
                  <div className="text-center space-y-2">
                    <p className="text-sm">Run optimize to see the result.</p>
                    <p className="text-xs">
                      Original and optimized PDFs will appear in side-by-side
                      tabs.
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
