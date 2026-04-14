"use client";

import { useState } from "react";
import type { DocAuthDocument } from "../../types";

interface ExportBarProps {
  document: DocAuthDocument | null;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export default function ExportBar({ document: doc }: ExportBarProps) {
  const [exporting, setExporting] = useState<string | null>(null);

  const handleExport = async (format: "pdf" | "docx" | "json") => {
    if (!doc) return;
    setExporting(format);
    try {
      if (format === "pdf") {
        const buffer = await doc.exportPDF();
        triggerDownload(
          new Blob([buffer], { type: "application/pdf" }),
          "invoice.pdf",
        );
      } else if (format === "docx") {
        const buffer = await doc.exportDOCX();
        triggerDownload(
          new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          }),
          "invoice.docx",
        );
      } else {
        const jsonString = await doc.saveDocumentJSONString();
        triggerDownload(
          new Blob([jsonString], { type: "application/json" }),
          "invoice.json",
        );
      }
    } catch (error) {
      console.error(`Export failed (${format}):`, error);
    } finally {
      setExporting(null);
    }
  };

  const buttonBase =
    "px-3 py-2 text-xs font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const buttonStyle =
    "bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600";

  return (
    <div className="flex gap-2 pt-4 border-t border-gray-700">
      <button
        type="button"
        onClick={() => handleExport("pdf")}
        disabled={!doc || exporting !== null}
        className={`${buttonBase} ${buttonStyle}`}
      >
        {exporting === "pdf" ? "Exporting..." : "Download PDF"}
      </button>
      <button
        type="button"
        onClick={() => handleExport("docx")}
        disabled={!doc || exporting !== null}
        className={`${buttonBase} ${buttonStyle}`}
      >
        {exporting === "docx" ? "Exporting..." : "Download DOCX"}
      </button>
      <button
        type="button"
        onClick={() => handleExport("json")}
        disabled={!doc || exporting !== null}
        className={`${buttonBase} ${buttonStyle}`}
      >
        {exporting === "json" ? "Exporting..." : "Download DocJSON"}
      </button>
    </div>
  );
}
