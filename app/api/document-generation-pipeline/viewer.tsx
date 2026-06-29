// app/api/document-generation-pipeline/viewer.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/app/_components/PageHeader";
import {
  DEFAULT_VALUES,
  type MergeValues,
  mergeTemplate,
} from "./contract-template";

interface StepEvent {
  step: string;
  status?: "done" | "error";
  detail?: string;
  pdfBase64?: string;
  anchors?: { fieldName: string; label: string; page: number }[];
}

type StepStatus = "pending" | "running" | "done" | "error";

const STEP_DEFS: { key: string; label: string }[] = [
  { key: "html", label: "Build HTML from form data" },
  { key: "pdf", label: "Generate PDF (HTML → PDF)" },
  { key: "locate", label: "Locate field anchors" },
  { key: "fields", label: "Scrub markers & add form fields" },
];

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// Today's date as a local YYYY-MM-DD string for the <input type="date"> default.
function todayISO(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Turn an ISO date (YYYY-MM-DD) into a human-readable string for the contract
// body, e.g. "June 29, 2026". Falls back to the raw value if not ISO.
function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  color: "var(--ink)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-2)",
  padding: "8px 10px",
  width: "100%",
};

export default function Viewer() {
  const [values, setValues] = useState<MergeValues>(() => ({
    ...DEFAULT_VALUES,
    effectiveDate: todayISO(),
  }));
  const [steps, setSteps] = useState<
    Record<string, { status: StepStatus; detail?: string }>
  >({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docBuffer, setDocBuffer] = useState<ArrayBuffer | null>(null);
  const [htmlPreview, setHtmlPreview] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  // biome-ignore lint/suspicious/noExplicitAny: NutrientViewer instance type is not available
  const instanceRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  function setStep(key: string, status: StepStatus, detail?: string) {
    setSteps((prev) => ({ ...prev, [key]: { status, detail } }));
  }

  // Merge values with the effective date formatted for the contract body.
  // Used for both the client-side preview and the server pipeline, so the
  // previewed HTML matches exactly what gets converted.
  function mergedValues(): MergeValues {
    return { ...values, effectiveDate: formatDate(values.effectiveDate) };
  }

  // Step 1: build and show the merged HTML. No PDF is produced yet.
  function preview() {
    setError(null);
    setDocBuffer(null);
    setSteps({});
    setHtmlPreview(mergeTemplate(mergedValues()));
  }

  // Step 2: run the DWS pipeline and swap the preview for the signable PDF.
  async function generate() {
    setRunning(true);
    setError(null);
    setDocBuffer(null);
    setSteps(
      Object.fromEntries(
        STEP_DEFS.map((s) => [s.key, { status: "pending" as StepStatus }]),
      ),
    );
    setStep(STEP_DEFS[0].key, "running");

    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const res = await fetch(
        "/api/document-generation-pipeline/api/generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mergedValues()),
          signal: controller.signal,
        },
      );
      if (!res.ok) {
        const text = await res.text();
        let message = `Request failed (${res.status})`;
        try {
          const parsed = JSON.parse(text);
          if (parsed?.error) message = parsed.error;
        } catch {
          // body was not JSON; keep the status-based message
        }
        throw new Error(message);
      }
      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        // biome-ignore lint/suspicious/noAssignInExpressions: standard line-buffer drain
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line) handleEvent(JSON.parse(line) as StepEvent);
        }
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRunning(false);
    }
  }

  function handleEvent(evt: StepEvent) {
    if (evt.step === "done" && evt.pdfBase64) {
      setDocBuffer(base64ToArrayBuffer(evt.pdfBase64));
      return;
    }
    if (evt.status === "error") {
      setStep(evt.step, "error", evt.detail);
      setError(evt.detail ?? "Pipeline failed");
      return;
    }
    // A completed step: mark it done and start the next one running.
    setStep(evt.step, "done", evt.detail);
    const idx = STEP_DEFS.findIndex((s) => s.key === evt.step);
    const next = STEP_DEFS[idx + 1];
    if (next) setStep(next.key, "running");
  }

  // Mount the Nutrient viewer when a finished document is available.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !docBuffer) return;
    let cancelled = false;

    (async () => {
      const NutrientViewer = window.NutrientViewer;
      if (!NutrientViewer) {
        setError("NutrientViewer is not loaded");
        return;
      }
      try {
        NutrientViewer.unload(container);
      } catch {
        // no existing instance
      }
      const instance = await NutrientViewer.load({
        container,
        document: docBuffer,
        licenseKey: process.env.NEXT_PUBLIC_NUTRIENT_LICENSE_KEY,
        useCDN: true,
      });
      if (cancelled) {
        NutrientViewer.unload(container);
        return;
      }
      instanceRef.current = instance;
    })();

    return () => {
      cancelled = true;
      const c = containerRef.current;
      if (window.NutrientViewer && c) {
        try {
          window.NutrientViewer.unload(c);
        } catch {
          // ignore
        }
      }
      instanceRef.current = null;
    };
  }, [docBuffer]);

  // Abort any in-flight fetch/stream when the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  const field = (key: keyof MergeValues, label: string, type = "text") => (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span
        style={{
          display: "block",
          fontSize: 13,
          color: "var(--ink-3)",
          marginBottom: 4,
        }}
      >
        {label}
      </span>
      <input
        type={type}
        style={inputStyle}
        value={values[key]}
        disabled={running}
        onChange={(e) => {
          setValues((v) => ({ ...v, [key]: e.target.value }));
          // Editing invalidates a shown preview/document — return to "Preview".
          setHtmlPreview(null);
          setDocBuffer(null);
        }}
      />
    </label>
  );

  // After a preview is shown (and before the PDF arrives), the button converts.
  const awaitingGenerate = htmlPreview !== null && !docBuffer;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Document Generation Pipeline"
        description="Generate a contract from data, auto-place signature fields by content with the DWS API, then sign it in the viewer."
      />
      <div className="shell flex flex-1 min-h-0" style={{ width: "100%" }}>
        <aside
          style={{
            width: 360,
            borderRight: "1px solid var(--line)",
            padding: 24,
            overflowY: "auto",
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            Agreement details
          </h2>
          {field("clientName", "Client name")}
          {field("providerName", "Provider name")}
          {field("feePerMonth", "Fee per month ($)")}
          {field("effectiveDate", "Effective date", "date")}

          <button
            type="button"
            onClick={awaitingGenerate ? generate : preview}
            disabled={running}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "10px 14px",
              borderRadius: "var(--r-2)",
              background: "var(--accent)",
              color: "var(--on-accent, #fff)",
              fontWeight: 600,
              opacity: running ? 0.6 : 1,
              cursor: running ? "default" : "pointer",
            }}
          >
            {running
              ? "Generating…"
              : awaitingGenerate
                ? "Generate signable PDF"
                : "Preview"}
          </button>

          <ul style={{ marginTop: 24, listStyle: "none", padding: 0 }}>
            {STEP_DEFS.map((def, i) => {
              const s = steps[def.key]?.status ?? "pending";
              const mark =
                s === "done"
                  ? "✓"
                  : s === "error"
                    ? "✗"
                    : s === "running"
                      ? "…"
                      : i + 1;
              const color =
                s === "error"
                  ? "var(--danger, #c0392b)"
                  : s === "done"
                    ? "var(--accent)"
                    : "var(--ink-3)";
              return (
                <li
                  key={def.key}
                  style={{ display: "flex", gap: 10, padding: "8px 0", color }}
                >
                  <span style={{ width: 18, textAlign: "center" }}>{mark}</span>
                  <span style={{ flex: 1 }}>
                    {def.label}
                    {steps[def.key]?.detail && (
                      <span
                        style={{
                          display: "block",
                          fontSize: 12,
                          color: "var(--ink-3)",
                        }}
                      >
                        {steps[def.key]?.detail}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          {error && (
            <p
              style={{
                marginTop: 12,
                color: "var(--danger, #c0392b)",
                fontSize: 13,
              }}
            >
              {error}
            </p>
          )}
        </aside>

        <main style={{ flex: 1, minWidth: 0, position: "relative" }}>
          {docBuffer ? (
            <div
              ref={containerRef}
              style={{ position: "absolute", inset: 0 }}
            />
          ) : htmlPreview ? (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {/* Constrain the preview to a document-like 768px column, centered. */}
              <div
                style={{
                  width: "100%",
                  maxWidth: 768,
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    padding: "8px 16px",
                    borderBottom: "1px solid var(--line)",
                    fontSize: 13,
                    color: "var(--ink-3)",
                  }}
                >
                  {running
                    ? "Converting to a signable PDF…"
                    : "HTML preview — click Generate to create the signable PDF"}
                </div>
                <iframe
                  title="Generated HTML preview"
                  srcDoc={htmlPreview}
                  sandbox=""
                  style={{
                    flex: 1,
                    width: "100%",
                    border: "none",
                    background: "#fff",
                  }}
                />
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center h-full"
              style={{ color: "var(--ink-3)" }}
            >
              <p>Fill the details and generate a document to sign.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
