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

  const handleExportPDF = async () => {
    if (!doc) return;
    setExporting("pdf");
    try {
      const buffer = await doc.exportPDF();
      triggerDownload(
        new Blob([buffer], { type: "application/pdf" }),
        "report.pdf",
      );
    } catch (error) {
      console.error("❌ PDF export failed:", error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportDOCX = async () => {
    if (!doc) return;
    setExporting("docx");
    try {
      const buffer = await doc.exportDOCX();
      triggerDownload(
        new Blob([buffer], {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }),
        "report.docx",
      );
    } catch (error) {
      console.error("❌ DOCX export failed:", error);
    } finally {
      setExporting(null);
    }
  };

  const handleExportDocJSON = async () => {
    if (!doc) return;
    setExporting("json");
    try {
      const jsonString = await doc.saveDocumentJSONString();
      triggerDownload(
        new Blob([jsonString], { type: "application/json" }),
        "report.json",
      );
    } catch (error) {
      console.error("❌ DocJSON export failed:", error);
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
        onClick={handleExportPDF}
        disabled={!doc || exporting !== null}
        className={`${buttonBase} ${buttonStyle}`}
      >
        {exporting === "pdf" ? "Exporting..." : "Download PDF"}
      </button>
      <button
        type="button"
        onClick={handleExportDOCX}
        disabled={!doc || exporting !== null}
        className={`${buttonBase} ${buttonStyle}`}
      >
        {exporting === "docx" ? "Exporting..." : "Download DOCX"}
      </button>
      <button
        type="button"
        onClick={handleExportDocJSON}
        disabled={!doc || exporting !== null}
        className={`${buttonBase} ${buttonStyle}`}
      >
        {exporting === "json" ? "Exporting..." : "Download DocJSON"}
      </button>
    </div>
  );
}
