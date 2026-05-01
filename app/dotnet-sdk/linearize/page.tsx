"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { DotNetSampleHeader } from "../_components/DotNetSampleHeader";
import { SamplePicker, type SampleOption } from "../_components/SamplePicker";

const Viewer = dynamic(() => import("../_components/PdfBlobViewer"), {
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
  const head = await blob.slice(0, 2048).text();
  return /\/Linearized\b/.test(head);
}

type TabId = "original" | "linearized";

const cardStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-3)",
  overflow: "hidden",
};

export default function LinearizePage() {
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    SAMPLES[0].id,
  );
  const [isRunning, setIsRunning] = useState(false);
  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [linearizedBlob, setLinearizedBlob] = useState<Blob | null>(null);
  const [originalSize, setOriginalSize] = useState<number | null>(null);
  const [linearizedSize, setLinearizedSize] = useState<number | null>(null);
  const [originalFastWebView, setOriginalFastWebView] = useState<
    boolean | null
  >(null);
  const [linearizedFastWebView, setLinearizedFastWebView] = useState<
    boolean | null
  >(null);
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
      formData.append(
        "file",
        new File([inputBlob], fileName, { type: "application/pdf" }),
      );

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

      const [origFwv, linearFwv] = await Promise.all([
        isLinearized(inputBlob),
        isLinearized(resultBlob),
      ]);
      setOriginalFastWebView(origFwv);
      setLinearizedFastWebView(linearFwv);

      setActiveTabId("linearized");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Linearization failed");
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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <DotNetSampleHeader
        title="Linearize PDF"
        description="Restructure a PDF for fast web view using the Nutrient .NET SDK. The first page renders before the full file downloads — ideal for HTTP delivery."
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
                    setLinearizedBlob(null);
                    setOriginalSize(null);
                    setLinearizedSize(null);
                    setOriginalFastWebView(null);
                    setLinearizedFastWebView(null);
                    setError(null);
                  }}
                  disabled={isRunning}
                />

                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isRunning}
                  className="btn btn-sm w-full"
                >
                  {isRunning ? "Linearizing..." : "Run"}
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

                {originalSize !== null && linearizedSize !== null && (
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
                            Original
                          </th>
                          <th
                            className="text-right px-3 py-2 font-semibold"
                            style={{ color: "var(--ink-3)" }}
                          >
                            Linearized
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: "1px solid var(--line)" }}>
                          <td
                            className="px-3 py-2"
                            style={{ color: "var(--ink-3)" }}
                          >
                            Fast Web View
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {originalFastWebView === null ? (
                              <span style={{ color: "var(--ink-4)" }}>—</span>
                            ) : originalFastWebView ? (
                              <span style={{ color: "var(--data-green)" }}>
                                Yes
                              </span>
                            ) : (
                              <span style={{ color: "var(--ink-3)" }}>No</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono">
                            {linearizedFastWebView === null ? (
                              <span style={{ color: "var(--ink-4)" }}>—</span>
                            ) : linearizedFastWebView ? (
                              <span style={{ color: "var(--data-green)" }}>
                                Yes
                              </span>
                            ) : (
                              <span style={{ color: "var(--ink-3)" }}>No</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td
                            className="px-3 py-2"
                            style={{ color: "var(--ink-3)" }}
                          >
                            Size
                          </td>
                          <td
                            className="px-3 py-2 text-right font-mono"
                            style={{ color: "var(--ink-2)" }}
                          >
                            {formatBytes(originalSize)}
                          </td>
                          <td
                            className="px-3 py-2 text-right font-mono"
                            style={{ color: "var(--ink-2)" }}
                          >
                            {formatBytes(linearizedSize)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {linearizedBlob && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="btn ghost btn-sm w-full"
                  >
                    Download Linearized PDF
                  </button>
                )}

                <p
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--ink-3)" }}
                >
                  Linearization restructures a PDF for fast web view, allowing
                  the first page to render before the entire file downloads.
                  Useful for documents served over HTTP.
                </p>
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
                      Linearizing PDF...
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
                    <p className="text-sm">Run linearize to see the result.</p>
                    <p className="text-xs">
                      Original and linearized PDFs will appear in side-by-side
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
