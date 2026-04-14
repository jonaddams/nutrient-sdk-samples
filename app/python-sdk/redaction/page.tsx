"use client";

import { useCallback, useState } from "react";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL || "http://localhost:8080";

const SAMPLE_DOC = {
  label: "Signed Service Agreement",
  path: "/documents/signed-service-agreement.pdf",
  filename: "signed-service-agreement.pdf",
};

const TOOLBAR_ITEMS = [
  { type: "zoom-out" },
  { type: "zoom-in" },
  { type: "zoom-mode" },
];

interface RedactionRegion {
  id: string;
  label: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  category: string;
}

/** Preset redaction regions targeting PII in the service agreement.
 *  PDF coordinates: origin at bottom-left, y increases upward.
 *  Page size: 594 x 846 points. */
const PRESET_REGIONS: RedactionRegion[] = [
  // Page 1 — Party details
  {
    id: "provider-name",
    label: "Service Provider name",
    category: "Names & Addresses",
    page: 0,
    x: 115,
    y: 608,
    width: 340,
    height: 18,
  },
  {
    id: "provider-address",
    label: "Service Provider street address",
    category: "Names & Addresses",
    page: 0,
    x: 115,
    y: 588,
    width: 340,
    height: 18,
  },
  {
    id: "provider-email",
    label: "Service Provider email",
    category: "Names & Addresses",
    page: 0,
    x: 115,
    y: 568,
    width: 300,
    height: 18,
  },
  {
    id: "client-name",
    label: "Client name",
    category: "Names & Addresses",
    page: 0,
    x: 115,
    y: 528,
    width: 340,
    height: 18,
  },
  {
    id: "client-address",
    label: "Client street address",
    category: "Names & Addresses",
    page: 0,
    x: 115,
    y: 508,
    width: 340,
    height: 18,
  },
  {
    id: "client-email",
    label: "Client email",
    category: "Names & Addresses",
    page: 0,
    x: 115,
    y: 488,
    width: 300,
    height: 18,
  },
  // Page 1 — Financial
  {
    id: "rate",
    label: "Hourly rate ($150/hr)",
    category: "Financial",
    page: 0,
    x: 335,
    y: 268,
    width: 105,
    height: 15,
  },
  // Page 1 — Initials
  {
    id: "initials-provider",
    label: "Service Provider initials",
    category: "Initials",
    page: 0,
    x: 130,
    y: 100,
    width: 110,
    height: 100,
  },
  {
    id: "initials-client",
    label: "Client initials",
    category: "Initials",
    page: 0,
    x: 345,
    y: 100,
    width: 110,
    height: 100,
  },
  // Page 2 — Signatures
  {
    id: "sig-provider",
    label: "Service Provider signature",
    category: "Signatures",
    page: 1,
    x: 80,
    y: 150,
    width: 240,
    height: 140,
  },
  {
    id: "sig-client",
    label: "Client signature",
    category: "Signatures",
    page: 1,
    x: 305,
    y: 155,
    width: 260,
    height: 130,
  },
];

const CATEGORIES = [...new Set(PRESET_REGIONS.map((r) => r.category))];

export default function RedactionPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleRegion = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectCategory = useCallback((category: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const ids = PRESET_REGIONS.filter((r) => r.category === category).map(
        (r) => r.id,
      );
      const allSelected = ids.every((id) => next.has(id));
      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === PRESET_REGIONS.length) return new Set();
      return new Set(PRESET_REGIONS.map((r) => r.id));
    });
  }, []);

  const handleRedact = async () => {
    if (selected.size === 0) return;
    setProcessing(true);
    setError(null);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
      setPdfUrl(null);
    }

    try {
      const res = await fetch(SAMPLE_DOC.path);
      const blob = await res.blob();
      const file = new File([blob], SAMPLE_DOC.filename);

      const regions = PRESET_REGIONS.filter((r) => selected.has(r.id)).map(
        ({ page, x, y, width, height }) => ({
          page,
          x,
          y,
          width,
          height,
        }),
      );

      const formData = new FormData();
      formData.append("file", file);
      formData.append("regions", JSON.stringify(regions));

      const apiRes = await fetch(`${API_BASE}/api/redaction/apply`, {
        method: "POST",
        body: formData,
      });

      if (!apiRes.ok) throw new Error(`API returned ${apiRes.status}`);

      const pdfBlob = await apiRes.blob();
      setPdfUrl(URL.createObjectURL(pdfBlob));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Redaction failed");
    } finally {
      setProcessing(false);
    }
  };

  const viewerDocument = pdfUrl || SAMPLE_DOC.path;

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <PythonSampleHeader
        title="PDF Redaction"
        description="Permanently remove sensitive content from PDF documents using the Nutrient Python SDK."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel */}
            <div className="w-80 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--warm-gray-400)]">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Redaction Regions
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    {selected.size}/{PRESET_REGIONS.length}
                  </span>
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <button
                  type="button"
                  onClick={selectAll}
                  className="w-full px-2 py-1.5 text-[11px] font-medium rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                >
                  {selected.size === PRESET_REGIONS.length
                    ? "Deselect All"
                    : "Select All"}
                </button>

                {CATEGORIES.map((category) => {
                  const items = PRESET_REGIONS.filter(
                    (r) => r.category === category,
                  );
                  const allChecked = items.every((r) => selected.has(r.id));
                  const someChecked =
                    !allChecked && items.some((r) => selected.has(r.id));

                  return (
                    <div key={category}>
                      <label className="flex items-center gap-2 mb-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => {
                            if (el) el.indeterminate = someChecked;
                          }}
                          onChange={() => selectCategory(category)}
                          className="w-3.5 h-3.5 rounded accent-red-600"
                        />
                        <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          {category}
                        </span>
                      </label>
                      <div className="space-y-1 ml-5">
                        {items.map((region) => (
                          <label
                            key={region.id}
                            className="flex items-center gap-2 py-0.5 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(region.id)}
                              onChange={() => toggleRegion(region.id)}
                              className="w-3.5 h-3.5 rounded accent-red-600"
                            />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {region.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-[var(--warm-gray-400)] space-y-2">
                <button
                  type="button"
                  onClick={handleRedact}
                  disabled={processing || selected.size === 0}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-red-600 hover:bg-red-700 text-white"
                >
                  {processing
                    ? "Redacting..."
                    : `Redact ${selected.size} Region${selected.size !== 1 ? "s" : ""}`}
                </button>

                {pdfUrl && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const a = window.document.createElement("a");
                        a.href = pdfUrl;
                        a.download = "redacted-document.pdf";
                        a.click();
                      }}
                      className="flex-1 px-4 py-2 text-xs font-semibold rounded-md cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        URL.revokeObjectURL(pdfUrl);
                        setPdfUrl(null);
                      }}
                      className="flex-1 px-4 py-2 text-xs font-semibold rounded-md cursor-pointer border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      Back to Original
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-md text-red-700 dark:text-red-300 text-xs">
                    {error}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel — Viewer */}
            <div className="flex-1 min-w-0 relative">
              <div className="absolute top-3 right-3 z-10 px-2.5 py-1 text-[10px] font-medium rounded-md bg-gray-900/70 text-white">
                {pdfUrl ? "Redacted Document" : "Original Document"}
              </div>

              {processing && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60">
                  <div className="text-center space-y-2">
                    <div className="inline-block w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Applying redactions...
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
