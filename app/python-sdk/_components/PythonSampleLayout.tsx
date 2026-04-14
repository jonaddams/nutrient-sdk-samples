"use client";

import { useState } from "react";
import { PythonSampleHeader } from "./PythonSampleHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL || "http://localhost:8080";

interface PythonSampleLayoutProps {
  title: string;
  description: string;
  apiEndpoint: string;
  sampleFile: string;
  sampleFileName: string;
  resultType: "pdf" | "download" | "html" | "json" | "text";
  extraFields?: React.ReactNode;
  buildFormData?: (file: File, formData: FormData) => void;
}

export function PythonSampleLayout({
  title,
  description,
  apiEndpoint,
  sampleFile,
  sampleFileName,
  resultType,
  extraFields,
  buildFormData,
}: PythonSampleLayoutProps) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number>(0);
  const processDocument = async () => {
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(sampleFile);
      const blob = await response.blob();
      const file = new File([blob], sampleFileName);

      const formData = new FormData();
      formData.append("file", file);
      if (buildFormData) {
        buildFormData(file, formData);
      }

      const res = await fetch(`${API_BASE}${apiEndpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      if (resultType === "json" || resultType === "text") {
        const text = await res.text();
        setResult(text);
        setResultSize(text.length);
      } else if (resultType === "html") {
        const html = await res.text();
        setResult(html);
        setResultSize(html.length);
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setResult(url);
        setResultSize(blob.size);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result;
    a.download = `output.${resultType === "html" ? "html" : "pdf"}`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PythonSampleHeader title={title} description={description} />

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
                <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-[#1a1414] rounded-md p-3">
                  <span className="font-mono text-xs">{sampleFileName}</span>
                </div>

                {extraFields}

                <button
                  type="button"
                  onClick={processDocument}
                  disabled={processing}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--digital-pollen)",
                    color: "var(--black)",
                  }}
                >
                  {processing ? "Processing..." : "Process Document"}
                </button>

                {resultSize > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Output: {(resultSize / 1024).toFixed(1)} KB
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel — Result */}
            <div className="flex-1 min-w-0 flex flex-col">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}

              {!result && !error && !processing && (
                <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600">
                  <p className="text-sm">
                    Click &quot;Process Document&quot; to see the result
                  </p>
                </div>
              )}

              {processing && (
                <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600">
                  <p className="text-sm">Processing document...</p>
                </div>
              )}

              {result && resultType === "json" && (
                <div className="flex-1 overflow-auto p-4">
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {JSON.stringify(JSON.parse(result), null, 2)}
                  </pre>
                </div>
              )}

              {result && resultType === "text" && (
                <div className="flex-1 overflow-auto p-4">
                  <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                    {result}
                  </pre>
                </div>
              )}

              {result && resultType === "html" && (
                <iframe
                  srcDoc={result}
                  className="flex-1 w-full border-0 bg-white"
                  title="Converted HTML"
                />
              )}

              {result &&
                (resultType === "pdf" || resultType === "download") && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Document processed successfully (
                      {(resultSize / 1024).toFixed(1)} KB)
                    </p>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="px-6 py-2.5 text-sm font-semibold rounded-md cursor-pointer"
                      style={{
                        background: "var(--digital-pollen)",
                        color: "var(--black)",
                      }}
                    >
                      Download Result
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
