"use client";

import { useCallback, useState } from "react";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";
import { ExtractionResultPanel } from "../_components/ExtractionResultPanel";
import { ProviderErrorCard } from "../_components/ProviderErrorCard";
import { ProviderToggle } from "../_components/ProviderToggle";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";
import {
  formatTiming,
  outcomeEntries,
  PROVIDER_LABELS,
  type Provider,
  type ProviderMode,
} from "../_components/providers";
import { useProviderRun } from "../_components/useProviderRun";
import { parseFieldNames } from "./fieldNames";

const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL || "http://localhost:8080";

const SAMPLE_DOCUMENTS = [
  {
    label: "Sakura Design Studio Invoice (SD-2025-0041)",
    path: "/invoices/Invoice SD-2025-0041.pdf",
    filename: "Invoice SD-2025-0041.pdf",
    fields: "invoice_number, total, due_date, vendor",
  },
  {
    label: "Patient Intake Form",
    path: "/documents/patient-intake-form.pdf",
    filename: "patient-intake-form.pdf",
    fields: "patient_name, date_of_birth, phone, email",
  },
];

interface NativeRegion {
  text: string | null;
  type: string | null;
  role: string | null;
  confidence: number;
  bounds: unknown;
}

interface FieldsResult {
  engine: string;
  filename: string;
  provider: string;
  requestedFields: string[];
  schemaFields: Record<string, unknown>;
  nativeRegions: NativeRegion[];
  rawElements: unknown[];
  parseError?: string;
}

export default function FieldExtractionPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fieldsInput, setFieldsInput] = useState(SAMPLE_DOCUMENTS[0].fields);
  const [mode, setMode] = useState<ProviderMode>("claude");
  const [error, setError] = useState<string | null>(null);
  const {
    runAll,
    loading: processing,
    outcomes,
    reset,
  } = useProviderRun<FieldsResult>();
  const entries = outcomeEntries(outcomes);

  const selected = SAMPLE_DOCUMENTS[selectedIndex];

  const handleSelect = (i: number) => {
    setSelectedIndex(i);
    setFieldsInput(SAMPLE_DOCUMENTS[i].fields);
    reset();
    setError(null);
  };

  const handleProcess = () => {
    const names = parseFieldNames(fieldsInput);
    if (names.length === 0) {
      setError("Enter at least one field name.");
      return;
    }
    setError(null);
    return runAll(mode, async (provider: Provider) => {
      const response = await fetch(selected.path);
      const blob = await response.blob();
      const file = new File([blob], selected.filename);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fields", names.join(", "));

      const res = await fetch(
        `${API_BASE}/api/extraction/fields?provider=${provider}`,
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
      return (await res.json()) as FieldsResult;
    });
  };

  const handleDownload = (provider: Provider, result: FieldsResult) => {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${selected.filename.replace(/\.[^.]+$/, "")}-fields-${provider}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const renderValue = useCallback(
    (v: unknown) =>
      v === null || v === undefined || v === "" ? (
        <span className="text-[var(--ink-4)] italic">not found</span>
      ) : (
        <span className="text-[var(--ink)]">{String(v)}</span>
      ),
    [],
  );

  const renderFormatted = (result: FieldsResult) => (
    <div className="p-4 space-y-5">
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)] mb-2">
          Schema-driven fields
        </h4>
        {result.parseError ? (
          <div className="text-xs text-[var(--code-coral)] space-y-2">
            <p>The model did not return valid JSON. Raw response:</p>
            <pre className="whitespace-pre-wrap font-mono text-[var(--ink-3)]">
              {result.parseError}
            </pre>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.requestedFields.map((name, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: field names are user-editable and may duplicate
                key={`${name}-${i}`}
                className="rounded-lg border border-[var(--line)] px-3 py-2"
              >
                <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--ink-4)]">
                  {name}
                </div>
                <div className="text-sm">
                  {renderValue(result.schemaFields[name])}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-3)] mb-2">
          Native KEY_VALUE_REGION
        </h4>
        {result.nativeRegions.length === 0 ? (
          <div className="text-xs text-[var(--ink-3)] rounded-lg border border-[var(--line)] px-3 py-2 leading-relaxed">
            The SDK&apos;s native KEY_VALUE_REGION returned no tagged regions
            for this document. The schema-driven result above is produced by a
            custom VLM prompt — which is why this demo pairs the two approaches.
          </div>
        ) : (
          <div className="space-y-1">
            {result.nativeRegions.map((r, i) => (
              <div
                // biome-ignore lint/suspicious/noArrayIndexKey: native regions are positional
                key={i}
                className="text-sm text-[var(--ink-2)] rounded border border-[var(--line)] px-2 py-1"
              >
                <span className="text-[10px] uppercase text-[var(--ink-4)] mr-2">
                  {r.role || r.type}
                </span>
                {r.text}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderRaw = (result: FieldsResult) => (
    <pre className="p-4 text-xs text-[var(--ink-3)] whitespace-pre-wrap font-mono leading-relaxed">
      {JSON.stringify(result, null, 2)}
    </pre>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PythonSampleHeader
        title="Field Extraction"
        description="Pull labeled fields into clean values — native key-value regions plus schema-driven extraction with a custom prompt, via Claude or OpenAI."
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
                  onChange={(e) => handleSelect(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--line-strong)] bg-[var(--bg-elev)] text-[var(--ink)]"
                >
                  {SAMPLE_DOCUMENTS.map((doc, i) => (
                    <option key={doc.path} value={i}>
                      {doc.label}
                    </option>
                  ))}
                </select>
                <div>
                  <label
                    htmlFor="fields-input"
                    className="block text-xs font-medium text-[var(--ink-3)] mb-1"
                  >
                    Fields to extract (comma-separated)
                  </label>
                  <textarea
                    id="fields-input"
                    value={fieldsInput}
                    onChange={(e) => setFieldsInput(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--line-strong)] bg-[var(--bg-elev)] text-[var(--ink)] font-mono"
                  />
                </div>
                <ProviderToggle
                  value={mode}
                  onChange={setMode}
                  disabled={processing}
                />
                <button
                  type="button"
                  onClick={handleProcess}
                  disabled={processing}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {processing ? "Extracting..." : "Extract Fields"}
                </button>
                {error && (
                  <div className="p-3 bg-[color-mix(in_srgb,var(--code-coral)_12%,var(--bg-elev))] rounded-md text-[var(--code-coral)] text-xs">
                    {error}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div
                className={`relative ${entries.length > 0 ? "h-[55%]" : "flex-1"}`}
              >
                {processing && (
                  <div
                    role="status"
                    aria-label="Extracting fields, please wait"
                    className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60"
                  >
                    <div className="text-center space-y-2">
                      <div className="inline-block w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-[var(--ink-3)]">
                        Extracting fields...
                      </p>
                    </div>
                  </div>
                )}
                <PdfViewer document={selected.path} />
              </div>
              {entries.length > 0 && (
                <div className="border-t border-[var(--line)] h-[45%] flex flex-col lg:flex-row">
                  {entries.map(([provider, outcome]) => (
                    <div
                      key={provider}
                      className="flex-1 min-w-0 min-h-0 border-b lg:border-b-0 lg:border-r last:border-0 border-[var(--line)]"
                    >
                      {outcome.status === "ok" ? (
                        <ExtractionResultPanel
                          title="Extracted Fields"
                          stats={`${PROVIDER_LABELS[provider]} · ${formatTiming(outcome.ms)} | ${outcome.data.requestedFields.length} requested | ${outcome.data.nativeRegions.length} native regions`}
                          primaryLabel="Formatted"
                          primary={renderFormatted(outcome.data)}
                          secondaryLabel="JSON"
                          secondary={renderRaw(outcome.data)}
                          onDownload={() =>
                            handleDownload(provider, outcome.data)
                          }
                        />
                      ) : (
                        <ProviderErrorCard
                          provider={provider}
                          message={outcome.message}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
