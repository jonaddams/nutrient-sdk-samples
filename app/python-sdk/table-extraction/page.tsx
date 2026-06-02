"use client";

import { useCallback, useMemo, useState } from "react";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";
import { confidenceBg, confidenceColor } from "../_components/confidence";
import { ExtractionResultPanel } from "../_components/ExtractionResultPanel";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";
import { buildGrid, type Cell, type TableResult } from "./buildGrid";

const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL || "http://localhost:8080";

const SAMPLE_DOCUMENTS = [
  {
    label: "Sakura Design Studio Invoice (SD-2025-0041)",
    path: "/invoices/Invoice SD-2025-0041.pdf",
    filename: "Invoice SD-2025-0041.pdf",
  },
];

interface TablesResult {
  engine: string;
  filename: string;
  provider: string;
  tableCount: number;
  tables: TableResult[];
  rawElements: unknown[];
}

export default function TableExtractionPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<TablesResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = SAMPLE_DOCUMENTS[selectedIndex];

  const handleProcess = async () => {
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch(selected.path);
      const blob = await response.blob();
      const file = new File([blob], selected.filename);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${API_BASE}/api/extraction/tables?provider=claude`,
        {
          method: "POST",
          body: formData,
        },
      );
      if (!res.ok) {
        const detail = await res
          .json()
          .then((b) => (typeof b?.detail === "string" ? b.detail : null))
          .catch(() => null);
        throw new Error(detail ?? `API returned ${res.status}`);
      }
      setResult((await res.json()) as TablesResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Table extraction failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${selected.filename.replace(/\.[^.]+$/, "")}-tables.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const totalCells = result
    ? result.tables.reduce((n, t) => n + t.cells.length, 0)
    : 0;

  const renderCellText = useCallback(
    (c: Cell) =>
      c.confidence < 0.7 ? (
        <span
          className="underline decoration-dotted decoration-yellow-500 dark:decoration-yellow-400"
          title={`${Math.round(c.confidence * 100)}% confidence`}
        >
          {c.text}
        </span>
      ) : (
        c.text
      ),
    [],
  );

  const formatted = useMemo(
    () => (
      <div className="p-4 space-y-6">
        {result?.tables.map((table, ti) => {
          const grid = buildGrid(
            table.cells,
            table.rowCount,
            table.columnCount,
          );
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: table index is stable positional key
            <div key={ti} className="space-y-1">
              <div className="text-xs text-[var(--ink-3)]">
                Table {ti + 1} — {table.rowCount}×{table.columnCount}
              </div>
              <table className="border-collapse text-sm text-[var(--ink-2)]">
                <tbody>
                  {grid.map((row, ri) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: row index is stable grid position
                    <tr key={ri}>
                      {row.map((c, ci) =>
                        c === null ? null : (
                          <td
                            // biome-ignore lint/suspicious/noArrayIndexKey: column index is stable grid position
                            key={ci}
                            rowSpan={c.rowSpan > 1 ? c.rowSpan : undefined}
                            colSpan={c.colSpan > 1 ? c.colSpan : undefined}
                            className={`border border-[var(--line)] px-2 py-1 align-top ${confidenceBg(
                              c.confidence,
                            )} ${confidenceColor(c.confidence)}`}
                          >
                            {renderCellText(c)}
                          </td>
                        ),
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    ),
    [result, renderCellText],
  );

  const raw = useMemo(
    () => (
      <pre className="p-4 text-xs text-[var(--ink-3)] whitespace-pre-wrap font-mono leading-relaxed">
        {result ? JSON.stringify(result, null, 2) : ""}
      </pre>
    ),
    [result],
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PythonSampleHeader
        title="Table Extraction"
        description="Extract structured tables — rows, columns, and spanning cells — from an invoice via VLM-enhanced extraction with Claude."
      />
      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-[var(--bg-elev)] rounded-xl shadow-lg border border-[var(--line)] overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            <div className="w-80 border-r border-[var(--line)] bg-[var(--bg-elev)] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--line)]">
                <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                  Source Document
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <select
                  aria-label="Source document"
                  value={selectedIndex}
                  onChange={(e) => {
                    setSelectedIndex(Number(e.target.value));
                    setResult(null);
                    setError(null);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--line-strong)] bg-[var(--bg-elev)] text-[var(--ink)]"
                >
                  {SAMPLE_DOCUMENTS.map((doc, i) => (
                    <option key={doc.path} value={i}>
                      {doc.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={processing}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {processing ? "Extracting..." : "Extract Tables"}
                </button>
                {error && (
                  <div className="p-3 bg-[color-mix(in_srgb,var(--code-coral)_12%,var(--bg-elev))] rounded-md text-[var(--code-coral)] text-xs">
                    {error}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div className={`relative ${result ? "h-[55%]" : "flex-1"}`}>
                {processing && (
                  <div
                    className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60"
                    role="status"
                    aria-label="Extracting tables, please wait"
                  >
                    <div className="text-center space-y-2">
                      <div className="inline-block w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-[var(--ink-3)]">
                        Extracting tables...
                      </p>
                    </div>
                  </div>
                )}
                <PdfViewer document={selected.path} />
              </div>
              {result && (
                <div className="border-t border-[var(--line)] h-[45%]">
                  <ExtractionResultPanel
                    title="Extracted Tables"
                    stats={`${result.tableCount} tables | ${totalCells} cells`}
                    primaryLabel="Formatted"
                    primary={formatted}
                    secondaryLabel="JSON"
                    secondary={raw}
                    onDownload={handleDownload}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
