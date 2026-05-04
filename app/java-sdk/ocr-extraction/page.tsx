"use client";

import { useCallback, useState } from "react";
import { JavaSampleHeader } from "../_components/JavaSampleHeader";
import { PdfViewer } from "../_components/PdfViewer";

const API_BASE =
  process.env.NEXT_PUBLIC_JAVA_SDK_API_URL || "http://localhost:8080";

const SAMPLE_IMAGES = [
  {
    label: "Milchick's Words",
    path: "/documents/milchick-words.png",
    filename: "milchick-words.png",
  },
  {
    label: "The Best Words",
    path: "/documents/the-best-words.png",
    filename: "the-best-words.png",
  },
];

const TOOLBAR_ITEMS = [
  { type: "zoom-out" },
  { type: "zoom-in" },
  { type: "zoom-mode" },
];

export default function OcrExtractionPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = SAMPLE_IMAGES[selectedIndex];

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    setExtractedText(null);

    try {
      const response = await fetch(selected.path);
      const blob = await response.blob();
      const file = new File([blob], selected.filename);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_BASE}/api/extraction/ocr`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data = await res.json();
      setExtractedText(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR extraction failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleImageChange = useCallback((index: number) => {
    setSelectedIndex(index);
    setExtractedText(null);
    setError(null);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <JavaSampleHeader
        title="OCR Text Extraction"
        description="Extract text from scanned documents using OCR via the Nutrient Java SDK Vision API."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-[var(--bg-elev)] rounded-xl shadow-lg border border-[var(--line)] overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel */}
            <div className="w-80 border-r border-[var(--line)] bg-[var(--bg-elev)] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--line)]">
                <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                  Source Image
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <select
                  value={selectedIndex}
                  onChange={(e) => handleImageChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--line-strong)] bg-[var(--bg-elev)] text-[var(--ink)]"
                >
                  {SAMPLE_IMAGES.map((img, i) => (
                    <option key={img.path} value={i}>
                      {img.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={processing}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                  }}
                >
                  {processing ? "Extracting..." : "Extract Text"}
                </button>

                {error && (
                  <div className="p-3 bg-[color-mix(in_srgb,var(--code-coral)_12%,var(--bg-elev))] rounded-md text-[var(--code-coral)] text-xs">
                    {error}
                  </div>
                )}

                {extractedText && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                      Extracted Text
                    </h3>
                    <pre className="text-xs text-[var(--ink-3)] bg-[var(--surface)] rounded-md p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-[calc(100vh-30rem)] overflow-y-auto">
                      {extractedText}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel — Viewer */}
            <div className="flex-1 min-w-0 relative">
              {processing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60">
                  <div className="text-center space-y-2">
                    <div className="inline-block w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[var(--ink-3)]">
                      Running OCR extraction...
                    </p>
                  </div>
                </div>
              )}

              <PdfViewer
                document={selected.path}
                toolbarItems={TOOLBAR_ITEMS}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
