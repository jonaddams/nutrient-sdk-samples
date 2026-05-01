"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
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
    subtitle: "4-page rasterized text PDF — OCR has plenty to work with.",
    url: "/documents/dotnet-sdk/scanned-sample.pdf",
  },
  {
    id: "scanned-invoice",
    label: "Scanned invoice",
    subtitle: "Image-only invoice scan — good for testing text extraction.",
    url: "/documents/scanned-invoice.pdf",
  },
];

const LANGUAGES = [
  { value: "eng", label: "English" },
  { value: "fra", label: "French" },
  { value: "deu", label: "German" },
  { value: "spa", label: "Spanish" },
];

type Mode = "pdf" | "text";
type TabId = "original" | "searchable";

function formatCount(n: number): string {
  return n.toLocaleString();
}

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

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--ink-2)",
  marginBottom: 6,
};

export default function OcrPage() {
  const [selectedSampleId, setSelectedSampleId] = useState<string>(
    SAMPLES[0].id,
  );
  const [mode, setMode] = useState<Mode>("pdf");
  const [language, setLanguage] = useState<string>("eng");

  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [searchableBlob, setSearchableBlob] = useState<Blob | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);

  const [activeTabId, setActiveTabId] = useState<TabId>("searchable");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sample = SAMPLES.find((s) => s.id === selectedSampleId);
    if (!sample) return;

    setIsLoadingPreview(true);
    setOriginalBlob(null);
    setSearchableBlob(null);
    setExtractedText(null);
    setError(null);

    fetch(sample.url)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load sample (${res.status})`);
        return res.blob();
      })
      .then((blob) => {
        if (!cancelled) {
          setOriginalBlob(blob);
          setActiveTabId("searchable");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load sample",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedSampleId]);

  function clearResultsKeepPreview() {
    setSearchableBlob(null);
    setExtractedText(null);
    setError(null);
  }

  const handleRun = async () => {
    if (!originalBlob) return;
    setIsRunning(true);
    setError(null);
    setSearchableBlob(null);
    setExtractedText(null);

    try {
      const sample = SAMPLES.find((s) => s.id === selectedSampleId)!;
      const fileName = sample.url.split("/").pop() ?? "document.pdf";
      const formData = new FormData();
      formData.append(
        "file",
        new File([originalBlob], fileName, { type: "application/pdf" }),
      );

      const queryParams = new URLSearchParams({ lang: language });
      if (mode === "text") queryParams.set("format", "json");

      const res = await fetch(`/api/dotnet-sdk/ocr?${queryParams.toString()}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server returned ${res.status} ${res.statusText}`);
      }

      if (mode === "pdf") {
        const resultBlob = await res.blob();
        setSearchableBlob(resultBlob);
        setActiveTabId("searchable");
      } else {
        const json = await res.json();
        setExtractedText(json.text ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed");
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!searchableBlob) return;
    const url = URL.createObjectURL(searchableBlob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "ocr-searchable.pdf";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleDownloadTxt = () => {
    if (extractedText === null) return;
    const blob = new Blob([extractedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = "ocr-extracted.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const handleCopy = async () => {
    if (extractedText === null) return;
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API may be unavailable
    }
  };

  const showTextResult = mode === "text" && extractedText !== null;
  const showTabbedPdfViewer =
    mode === "pdf" && searchableBlob !== null && originalBlob !== null;
  const showPreviewOnly =
    !showTextResult && !showTabbedPdfViewer && originalBlob !== null;

  const activeBlob = activeTabId === "original" ? originalBlob : searchableBlob;

  const TABS: { id: TabId; label: string }[] = [
    { id: "original", label: "Original" },
    { id: "searchable", label: "Searchable" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <DotNetSampleHeader
        title="OCR"
        description="Run optical character recognition on a scanned PDF using the Nutrient .NET SDK. Choose Searchable PDF to add a selectable text layer, or Extracted Text to pull out the raw recognized text."
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
                  onSelect={(id) => setSelectedSampleId(id)}
                  disabled={isRunning}
                />

                {/* Mode toggle */}
                <div>
                  <span style={labelStyle}>Output Mode</span>
                  <div
                    className="flex overflow-hidden"
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-2)",
                    }}
                  >
                    {(["pdf", "text"] as Mode[]).map((m, i) => {
                      const isActive = mode === m;
                      const label =
                        m === "pdf" ? "Searchable PDF" : "Extracted Text";
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setMode(m);
                            clearResultsKeepPreview();
                          }}
                          disabled={isRunning}
                          className="flex-1 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed"
                          style={{
                            background: isActive
                              ? "var(--accent)"
                              : "var(--bg-elev)",
                            color: isActive ? "var(--bg)" : "var(--ink-2)",
                            borderLeft:
                              i === 0 ? "none" : "1px solid var(--line)",
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label htmlFor="language" style={labelStyle}>
                    Language
                  </label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      clearResultsKeepPreview();
                    }}
                    disabled={isRunning}
                    className="w-full px-2 py-1.5 text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    style={inputStyle}
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <p
                    className="mt-1 text-xs leading-snug"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Select the language of the document text. Mismatched
                    language will degrade recognition quality.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleRun}
                  disabled={isRunning || !originalBlob}
                  className="btn btn-sm w-full"
                >
                  {isRunning ? "Running OCR..." : "Run OCR"}
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

                {searchableBlob && mode === "pdf" && (
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="btn ghost btn-sm w-full"
                  >
                    Download Searchable PDF
                  </button>
                )}

                {extractedText !== null && mode === "text" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="btn ghost btn-sm flex-1"
                    >
                      Download .txt
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="btn ghost btn-sm flex-1"
                    >
                      {copied ? "Copied!" : "Copy to clipboard"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel — Results */}
            <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-12rem)] relative">
              {(isRunning || isLoadingPreview) && (
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
                      {isRunning ? "Running OCR..." : "Loading preview..."}
                    </p>
                  </div>
                </div>
              )}

              {showTextResult ? (
                <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
                  <p
                    className="text-xs font-medium shrink-0"
                    style={{ color: "var(--ink-3)" }}
                  >
                    Extracted {formatCount(extractedText.length)} characters
                  </p>
                  <pre
                    className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed whitespace-pre"
                    style={{
                      background: "var(--surface)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-2)",
                      color: "var(--ink-2)",
                    }}
                  >
                    {extractedText}
                  </pre>
                </div>
              ) : showTabbedPdfViewer ? (
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

                  <div className="flex-1 min-h-0 flex flex-col">
                    {activeBlob && (
                      <Viewer key={activeTabId} blob={activeBlob} />
                    )}
                    {activeTabId === "searchable" && (
                      <p
                        className="shrink-0 px-4 py-2 text-xs"
                        style={{
                          color: "var(--ink-4)",
                          borderTop: "1px solid var(--line)",
                        }}
                      >
                        This PDF now has a selectable text layer — try
                        selecting a word.
                      </p>
                    )}
                  </div>
                </>
              ) : showPreviewOnly ? (
                <>
                  <div
                    className="shrink-0 px-4 py-2 text-xs"
                    style={{
                      background: "var(--surface)",
                      color: "var(--ink-3)",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    Preview of input document — try selecting text to confirm
                    it&apos;s an image-based PDF, then run OCR.
                  </div>
                  <div className="flex-1 min-h-0">
                    <Viewer key={selectedSampleId} blob={originalBlob!} />
                  </div>
                </>
              ) : (
                <div
                  className="flex-1 flex items-center justify-center"
                  style={{ color: "var(--ink-4)" }}
                >
                  <div className="text-center space-y-2">
                    <p className="text-sm">Select a sample to preview.</p>
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
