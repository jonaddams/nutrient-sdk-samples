"use client";

import { useCallback, useEffect, useState } from "react";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL || "http://localhost:8080";

const SAMPLE_TEMPLATES = [
  {
    label: "Farm Invoice",
    templatePath: "/documents/docx-templates/farm-invoice-template.docx",
    dataPath: "/document-authoring-sdk/data/invoice.json",
  },
  {
    label: "Business Startup Checklist",
    templatePath:
      "/documents/docx-templates/business-startup-checklist-template.docx",
    dataPath: "/document-authoring-sdk/data/checklist.json",
  },
  {
    label: "Restaurant Menu",
    templatePath: "/documents/docx-templates/menu-template.docx",
    dataPath: "/document-authoring-sdk/data/menu.json",
  },
];

const TOOLBAR_ITEMS = [
  { type: "zoom-out" },
  { type: "zoom-in" },
  { type: "zoom-mode" },
];

export default function WordTemplatePage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [modelJson, setModelJson] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const selected = SAMPLE_TEMPLATES[selectedIndex];

  // Load the data model when template changes
  useEffect(() => {
    fetch(selected.dataPath)
      .then((res) => res.json())
      .then((data) => setModelJson(JSON.stringify(data, null, 2)))
      .catch(() => setModelJson(""));
  }, [selected.dataPath]);

  const handleTemplateChange = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      setError(null);
    },
    [pdfUrl],
  );

  const handleGenerate = async () => {
    setProcessing(true);
    setError(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    try {
      const templateRes = await fetch(selected.templatePath);
      const templateBlob = await templateRes.blob();
      const templateFile = new File(
        [templateBlob],
        selected.templatePath.split("/").pop()!,
      );

      const formData = new FormData();
      formData.append("template", templateFile);
      formData.append("model", modelJson);

      const res = await fetch(`${API_BASE}/api/templates/generate`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const blob = await res.blob();
      setPdfUrl(URL.createObjectURL(blob));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Template generation failed",
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = window.document.createElement("a");
    a.href = pdfUrl;
    a.download = "generated-document.pdf";
    a.click();
  };

  // Show populated PDF if available, otherwise show the DOCX template
  const viewerDocument = pdfUrl || selected.templatePath;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PythonSampleHeader
        title="Word Template Generation"
        description="Generate PDF documents from Word templates populated with JSON data using the Nutrient Python SDK."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-[var(--bg-elev)] rounded-xl shadow-lg border border-[var(--line)] overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel — Controls */}
            <div className="w-96 border-r border-[var(--line)] bg-[var(--bg-elev)] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--line)]">
                <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                  Template &amp; Data
                </h3>
              </div>

              <div className="p-4 space-y-2 border-b border-[var(--line)]">
                <select
                  value={selectedIndex}
                  onChange={(e) => handleTemplateChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--line-strong)] bg-[var(--bg-elev)] text-[var(--ink)]"
                >
                  {SAMPLE_TEMPLATES.map((t, i) => (
                    <option key={t.templatePath} value={i}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <label className="block text-xs font-medium text-[var(--ink-3)] pt-1">
                  JSON Data Model
                </label>
              </div>

              <textarea
                value={modelJson}
                onChange={(e) => setModelJson(e.target.value)}
                spellCheck={false}
                className="flex-1 w-full p-4 text-xs font-mono leading-relaxed bg-[var(--bg-elev)] text-[var(--ink)] border-0 outline-none resize-none"
              />

              <div className="p-4 space-y-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={processing || !modelJson}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--accent)",
                    color: "#fff",
                  }}
                >
                  {processing ? "Generating..." : "Generate PDF"}
                </button>

                {pdfUrl && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer border border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface)]"
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(pdfUrl);
                        setPdfUrl(null);
                      }}
                      className="px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer border border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface)]"
                    >
                      Back to Template
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-[color-mix(in_srgb,var(--code-coral)_12%,var(--bg-elev))] rounded-md text-[var(--code-coral)] text-xs">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel — Viewer */}
            <div className="flex-1 min-w-0 relative">
              {/* Label showing what's displayed */}
              <div className="absolute top-3 right-3 z-10 px-2.5 py-1 text-[10px] font-medium rounded-md bg-gray-900/70 text-white">
                {pdfUrl ? "Generated PDF" : "DOCX Template"}
              </div>

              {processing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60">
                  <div className="text-center space-y-2">
                    <div className="inline-block w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-[var(--ink-3)]">
                      Populating template and converting to PDF...
                    </p>
                  </div>
                </div>
              )}

              <PdfViewer
                document={viewerDocument}
                toolbarItems={TOOLBAR_ITEMS}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
