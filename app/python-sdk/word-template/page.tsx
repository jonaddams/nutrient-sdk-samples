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
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PythonSampleHeader
        title="Word Template Generation"
        description="Generate PDF documents from Word templates populated with JSON data using the Nutrient Python SDK."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel — Controls */}
            <div className="w-96 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--warm-gray-400)]">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Template &amp; Data
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <select
                  value={selectedIndex}
                  onChange={(e) => handleTemplateChange(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1414] text-gray-900 dark:text-gray-100"
                >
                  {SAMPLE_TEMPLATES.map((t, i) => (
                    <option key={t.templatePath} value={i}>
                      {t.label}
                    </option>
                  ))}
                </select>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    JSON Data Model
                  </label>
                  <textarea
                    value={modelJson}
                    onChange={(e) => setModelJson(e.target.value)}
                    className="w-full h-48 px-3 py-2 text-xs font-mono rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1a1414] text-gray-900 dark:text-gray-100 resize-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={processing || !modelJson}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--digital-pollen)",
                    color: "var(--black)",
                  }}
                >
                  {processing ? "Generating..." : "Generate PDF"}
                </button>

                {pdfUrl && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Download PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(pdfUrl);
                        setPdfUrl(null);
                      }}
                      className="px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Back to Template
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-md text-red-700 dark:text-red-300 text-xs">
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
                    <div className="inline-block w-6 h-6 border-2 border-[var(--digital-pollen)] border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
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
