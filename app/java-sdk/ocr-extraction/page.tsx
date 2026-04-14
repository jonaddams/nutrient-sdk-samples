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
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <JavaSampleHeader
        title="OCR Text Extraction"
        description="Extract text from scanned documents using OCR via the Nutrient Java SDK Vision API."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel */}
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--warm-gray-400)]">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Source Image
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <select
                  value={selectedIndex}
                  onChange={(e) => handleImageChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1414] text-gray-900 dark:text-gray-100"
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
                    background: "var(--digital-pollen)",
                    color: "var(--black)",
                  }}
                >
                  {processing ? "Extracting..." : "Extract Text"}
                </button>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-red-700 dark:text-red-300 text-xs">
                    {error}
                  </div>
                )}

                {extractedText && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Extracted Text
                    </h3>
                    <pre className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1414] rounded-md p-3 whitespace-pre-wrap font-mono leading-relaxed max-h-[calc(100vh-30rem)] overflow-y-auto">
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
                    <div className="inline-block w-6 h-6 border-2 border-[var(--digital-pollen)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
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
