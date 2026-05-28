"use client";

import { useCallback, useEffect, useState } from "react";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL || "http://localhost:8080";

const SAMPLE_PDF = {
  label: "Form Detection Sample",
  path: "/documents/input_forms_detection.pdf",
  filename: "input_forms_detection.pdf",
};

const TOOLBAR_ITEMS = [
  { type: "zoom-out" },
  { type: "zoom-in" },
  { type: "zoom-mode" },
];

interface AddedField {
  name: string;
  type: string;
}

interface DetectResult {
  inputFieldCount: number;
  detectedFieldCount: number;
  addedFields: AddedField[];
  pdfBase64: string;
}

function prettyFieldType(typeName: string): string {
  return typeName.replace(/^Pdf/, "").replace(/Field$/, "").toLowerCase();
}

function summarizeFieldTypes(fields: AddedField[]): { type: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const f of fields) {
    const key = prettyFieldType(f.type);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({ type, count }));
}

function base64ToBlob(base64: string, mime: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export default function FormDetectionPage() {
  const [result, setResult] = useState<DetectResult | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>(SAMPLE_PDF.path);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Revoke object URL on unmount or when it changes
  useEffect(() => {
    return () => {
      if (pdfUrl.startsWith("blob:")) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  const handleDetect = async () => {
    setProcessing(true);
    setError(null);
    try {
      const sampleRes = await fetch(SAMPLE_PDF.path);
      const sampleBlob = await sampleRes.blob();
      const file = new File([sampleBlob], SAMPLE_PDF.filename, {
        type: "application/pdf",
      });

      const formData = new FormData();
      formData.append("file", file);

      const apiRes = await fetch(`${API_BASE}/api/forms/detect`, {
        method: "POST",
        body: formData,
      });

      if (!apiRes.ok) {
        const detail = await apiRes
          .json()
          .then((b) => (typeof b?.detail === "string" ? b.detail : null))
          .catch(() => null);
        throw new Error(detail ?? `API returned ${apiRes.status}`);
      }

      const data: DetectResult = await apiRes.json();
      const blob = base64ToBlob(data.pdfBase64, "application/pdf");
      const newUrl = URL.createObjectURL(blob);

      if (pdfUrl.startsWith("blob:")) URL.revokeObjectURL(pdfUrl);
      setPdfUrl(newUrl);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Form detection failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = useCallback(() => {
    if (pdfUrl.startsWith("blob:")) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(SAMPLE_PDF.path);
    setResult(null);
    setError(null);
  }, [pdfUrl]);

  const breakdown = result ? summarizeFieldTypes(result.addedFields) : [];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PythonSampleHeader
        title="PDF Form Field Detection"
        description="Detect form fields in an unfielded PDF using the Nutrient Python SDK's machine-learning detector."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-[var(--bg-elev)] rounded-xl shadow-lg border border-[var(--line)] overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel — Stats / actions */}
            <div className="w-96 border-r border-[var(--line)] bg-[var(--bg-elev)] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--line)]">
                <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                  Detection Results
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!result && !error && (
                  <p className="text-sm text-[var(--ink-3)]">
                    The sample PDF has <strong>0</strong> form fields. Click
                    "Detect form fields" to run ML detection on the document.
                  </p>
                )}

                {error && (
                  <div className="rounded-md border border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-300">
                    {error}
                  </div>
                )}

                {result && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-[var(--ink-3)]">
                        Fields detected
                      </p>
                      <p className="text-3xl font-semibold text-[var(--ink-1)]">
                        {result.detectedFieldCount}
                      </p>
                      <p className="text-xs text-[var(--ink-3)]">
                        from {result.inputFieldCount} in the source PDF
                      </p>
                    </div>

                    {breakdown.length > 1 && (
                      <div>
                        <p className="text-xs uppercase tracking-wide text-[var(--ink-3)] mb-1">
                          Breakdown
                        </p>
                        <ul className="text-sm text-[var(--ink-2)] space-y-1">
                          {breakdown.map((b) => (
                            <li key={b.type} className="flex justify-between">
                              <span>{b.type}</span>
                              <span className="font-medium">{b.count}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-[var(--line)] space-y-2">
                <button
                  type="button"
                  onClick={handleDetect}
                  disabled={processing || result !== null}
                  className="w-full px-3 py-2 rounded-md bg-[var(--accent)] text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? "Detecting…" : "Detect form fields"}
                </button>
                {result && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="w-full px-3 py-2 rounded-md border border-[var(--line)] text-sm text-[var(--ink-2)]"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Right Panel — Viewer */}
            <div className="flex-1 min-w-0 relative">
              <div className="absolute top-3 right-3 z-10 px-2.5 py-1 text-[10px] font-medium rounded-md bg-gray-900/70 text-white">
                {result ? "With detected fields" : "Original PDF"}
              </div>

              {processing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60">
                  <div className="text-center space-y-2">
                    <div className="inline-block w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[var(--ink-3)]">
                      Detecting form fields…
                    </p>
                  </div>
                </div>
              )}

              <PdfViewer document={pdfUrl} toolbarItems={TOOLBAR_ITEMS} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
