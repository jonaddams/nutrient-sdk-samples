"use client";

import { useState } from "react";
import { JavaSampleHeader } from "./JavaSampleHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_JAVA_SDK_API_URL || "http://localhost:8080";

interface JavaSampleLayoutProps {
  title: string;
  description: string;
  apiEndpoint: string;
  sampleFile: string;
  sampleFileName: string;
  resultType: "pdf" | "download" | "html" | "json" | "text";
  /** Additional form fields beyond the file */
  extraFields?: React.ReactNode;
  /** Build FormData with extra fields */
  buildFormData?: (file: File, formData: FormData) => void;
}

const cardStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-3)",
  overflow: "hidden",
};

export function JavaSampleLayout({
  title,
  description,
  apiEndpoint,
  sampleFile,
  sampleFileName,
  resultType,
  extraFields,
  buildFormData,
}: JavaSampleLayoutProps) {
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number>(0);
  const [useCustomFile, setUseCustomFile] = useState(false);
  const [customFile, setCustomFile] = useState<File | null>(null);

  const processDocument = async () => {
    setProcessing(true);
    setError(null);
    setResult(null);

    try {
      let file: File;
      if (useCustomFile && customFile) {
        file = customFile;
      } else {
        const response = await fetch(sampleFile);
        const blob = await response.blob();
        file = new File([blob], sampleFileName);
      }

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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <JavaSampleHeader title={title} description={description} />

      <main
        className="shell"
        style={{
          paddingTop: "var(--space-6)",
          paddingBottom: "var(--space-8)",
        }}
      >
        <div style={{ ...cardStyle, height: "calc(100vh - 12rem)" }}>
          <div className="flex h-full">
            {/* Left Panel — Controls */}
            <div
              className="w-80 flex flex-col shrink-0"
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
                {/* File source toggle */}
                <div
                  className="flex gap-1 p-1"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-2)",
                  }}
                >
                  {(
                    [
                      { v: false, label: "Sample File" },
                      { v: true, label: "Upload File" },
                    ] as const
                  ).map(({ v, label }) => {
                    const isActive = useCustomFile === v;
                    return (
                      <button
                        key={String(v)}
                        type="button"
                        onClick={() => setUseCustomFile(v)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                        style={{
                          background: isActive
                            ? "var(--bg-elev)"
                            : "transparent",
                          color: isActive ? "var(--ink)" : "var(--ink-3)",
                          borderRadius: "var(--r-1)",
                          boxShadow: isActive
                            ? "0 1px 2px rgba(0,0,0,0.06)"
                            : undefined,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {useCustomFile ? (
                  <input
                    type="file"
                    onChange={(e) => setCustomFile(e.target.files?.[0] || null)}
                    className="w-full text-sm"
                    style={{ color: "var(--ink-2)" }}
                  />
                ) : (
                  <div
                    className="text-sm p-3"
                    style={{
                      background: "var(--bg-elev)",
                      color: "var(--ink-2)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-2)",
                    }}
                  >
                    <span className="font-mono text-xs">{sampleFileName}</span>
                  </div>
                )}

                {extraFields}

                <button
                  type="button"
                  onClick={processDocument}
                  disabled={processing || (useCustomFile && !customFile)}
                  className="btn btn-sm w-full"
                >
                  {processing ? "Processing..." : "Process Document"}
                </button>

                {resultSize > 0 && (
                  <div className="text-xs" style={{ color: "var(--ink-3)" }}>
                    Output: {(resultSize / 1024).toFixed(1)} KB
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel — Result */}
            <div className="flex-1 min-w-0 flex flex-col">
              {error && (
                <div
                  className="p-4 text-sm"
                  style={{
                    background:
                      "color-mix(in srgb, var(--code-coral) 12%, var(--bg-elev))",
                    borderBottom:
                      "1px solid color-mix(in srgb, var(--code-coral) 35%, var(--line))",
                    color: "var(--code-coral)",
                  }}
                >
                  {error}
                </div>
              )}

              {!result && !error && !processing && (
                <div
                  className="flex-1 flex items-center justify-center"
                  style={{ color: "var(--ink-4)" }}
                >
                  <p className="text-sm">
                    Click &quot;Process Document&quot; to see the result
                  </p>
                </div>
              )}

              {processing && (
                <div
                  className="flex-1 flex items-center justify-center"
                  style={{ color: "var(--ink-3)" }}
                >
                  <p className="text-sm">Processing document...</p>
                </div>
              )}

              {result && resultType === "json" && (
                <div className="flex-1 overflow-auto p-4">
                  <pre
                    className="text-sm whitespace-pre-wrap font-mono leading-relaxed"
                    style={{
                      color: "var(--ink-2)",
                      background: "transparent",
                      border: 0,
                      padding: 0,
                    }}
                  >
                    {JSON.stringify(JSON.parse(result), null, 2)}
                  </pre>
                </div>
              )}

              {result && resultType === "text" && (
                <div className="flex-1 overflow-auto p-4">
                  <pre
                    className="text-sm whitespace-pre-wrap font-mono leading-relaxed"
                    style={{
                      color: "var(--ink-2)",
                      background: "transparent",
                      border: 0,
                      padding: 0,
                    }}
                  >
                    {result}
                  </pre>
                </div>
              )}

              {result && resultType === "html" && (
                <iframe
                  srcDoc={result}
                  className="flex-1 w-full border-0"
                  style={{ background: "#fff" }}
                  title="Converted HTML"
                />
              )}

              {result &&
                (resultType === "pdf" || resultType === "download") && (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                      Document processed successfully (
                      {(resultSize / 1024).toFixed(1)} KB)
                    </p>
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="btn"
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
