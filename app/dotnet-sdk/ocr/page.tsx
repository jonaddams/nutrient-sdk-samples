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

export default function OcrPage() {
  const [selectedSampleId, setSelectedSampleId] = useState<string>(SAMPLES[0].id);
  const [mode, setMode] = useState<Mode>("pdf");
  const [language, setLanguage] = useState<string>("eng");

  const [originalBlob, setOriginalBlob] = useState<Blob | null>(null);
  const [searchableBlob, setSearchableBlob] = useState<Blob | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);

  const [activeTabId, setActiveTabId] = useState<TabId>("searchable");
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  function clearResults() {
    setOriginalBlob(null);
    setSearchableBlob(null);
    setExtractedText(null);
    setError(null);
  }

  const handleRun = async () => {
    setIsRunning(true);
    setError(null);
    setSearchableBlob(null);
    setExtractedText(null);

    try {
      const sample = SAMPLES.find((s) => s.id === selectedSampleId)!;
      const sourceResponse = await fetch(sample.url);
      if (!sourceResponse.ok) throw new Error("Failed to load sample");
      const sourceBlob = await sourceResponse.blob();
      setOriginalBlob(sourceBlob);

      const fileName = sample.url.split("/").pop() ?? "document.pdf";
      const formData = new FormData();
      formData.append("file", new File([sourceBlob], fileName, { type: "application/pdf" }));

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
      // clipboard API may be unavailable in some contexts
    }
  };

  const showPdfViewer = mode === "pdf" && searchableBlob !== null;
  const showTextResult = mode === "text" && extractedText !== null;
  const activeBlob = activeTabId === "original" ? originalBlob : searchableBlob;

  const TABS: { id: TabId; label: string }[] = [
    { id: "original", label: "Original" },
    { id: "searchable", label: "Searchable" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <DotNetSampleHeader
        title="OCR"
        description="Run optical character recognition on a scanned PDF using the Nutrient .NET SDK. Choose Searchable PDF to add a selectable text layer, or Extracted Text to pull out the raw recognized text."
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
                    clearResults();
                  }}
                  disabled={isRunning}
                />

                {/* Mode toggle */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    Output Mode
                  </label>
                  <div className="flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("pdf");
                        clearResults();
                      }}
                      disabled={isRunning}
                      className={
                        "flex-1 px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed " +
                        (mode === "pdf"
                          ? "bg-[var(--digital-pollen)] text-[var(--black)]"
                          : "bg-white dark:bg-[#1a1414] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900")
                      }
                    >
                      Searchable PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("text");
                        clearResults();
                      }}
                      disabled={isRunning}
                      className={
                        "flex-1 px-3 py-1.5 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 transition-colors cursor-pointer disabled:cursor-not-allowed " +
                        (mode === "text"
                          ? "bg-[var(--digital-pollen)] text-[var(--black)]"
                          : "bg-white dark:bg-[#1a1414] text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900")
                      }
                    >
                      Extracted Text
                    </button>
                  </div>
                </div>

                {/* Language dropdown */}
                <div>
                  <label
                    htmlFor="language"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                  >
                    Language
                  </label>
                  <select
                    id="language"
                    value={language}
                    onChange={(e) => {
                      setLanguage(e.target.value);
                      clearResults();
                    }}
                    disabled={isRunning}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-[#1a1414] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 leading-snug">
                    Select the language of the document text. Mismatched language
                    will degrade recognition quality.
                  </p>
                </div>

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
                  {isRunning ? "Running OCR..." : "Run OCR"}
                </button>

                {/* Error */}
                {error && (
                  <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                {/* Download button — PDF mode */}
                {searchableBlob && mode === "pdf" && (
                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Download Searchable PDF
                  </button>
                )}

                {/* Download + Copy buttons — text mode */}
                {extractedText !== null && mode === "text" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadTxt}
                      className="flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      Download .txt
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {copied ? "Copied!" : "Copy to clipboard"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel — Results */}
            <div className="flex-1 min-w-0 flex flex-col h-[calc(100vh-12rem)]">
              {isRunning && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60 pointer-events-none">
                  <div className="text-center space-y-2">
                    <div className="inline-block w-6 h-6 border-2 border-[var(--digital-pollen)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Running OCR...
                    </p>
                  </div>
                </div>
              )}

              {showPdfViewer ? (
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

                  {/* PDF viewer */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    {activeBlob && (
                      <Viewer key={activeTabId} blob={activeBlob} />
                    )}
                    {activeTabId === "searchable" && (
                      <p className="flex-shrink-0 px-4 py-2 text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800">
                        This PDF now has a selectable text layer — try selecting a word.
                      </p>
                    )}
                  </div>
                </>
              ) : showTextResult ? (
                <div className="flex-1 min-h-0 flex flex-col p-4 gap-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
                    Extracted {formatCount(extractedText.length)} characters
                  </p>
                  <pre className="flex-1 overflow-auto rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1414] p-4 text-xs font-mono text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                    {extractedText}
                  </pre>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600">
                  <div className="text-center space-y-2">
                    <p className="text-sm">Run OCR to see the result.</p>
                    <p className="text-xs">
                      {mode === "pdf"
                        ? "Original and searchable PDFs will appear in side-by-side tabs."
                        : "The extracted text will appear here."}
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
