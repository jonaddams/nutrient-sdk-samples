"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { ConfirmDialog } from "@/app/_components/ConfirmDialog";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";
import type { MarkSummary, SearchAndRedactHandle } from "./viewer";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

interface PresetOption {
  key: string;
  label: string;
  hint: string;
}

const PRESETS: PresetOption[] = [
  {
    key: "credit_card_number",
    label: "Credit Card Numbers",
    hint: "13–19 digit numbers starting 1–6",
  },
  {
    key: "social_security_number",
    label: "Social Security Numbers",
    hint: "XXX-XX-XXXX or XXXXXXXXX",
  },
  { key: "email_address", label: "Email Addresses", hint: "name@domain.tld" },
  {
    key: "north_american_phone_number",
    label: "Phone Numbers (NANP)",
    hint: "US / Canada style numbers",
  },
  {
    key: "international_phone_number",
    label: "Phone Numbers (International)",
    hint: "+ or 00 prefix, 7–15 digits",
  },
  { key: "date", label: "Dates", hint: "mm/dd/yyyy, dd-mm-yy, etc." },
  { key: "url", label: "URLs", hint: "http, https, or www links" },
  { key: "us_zip_code", label: "US ZIP Codes", hint: "00000 or 00000-0000" },
  {
    key: "vin",
    label: "Vehicle Identification Numbers",
    hint: "17-character VINs",
  },
  { key: "ipv4", label: "IP Addresses (v4)", hint: "0.0.0.0 format" },
];

const sectionBorder: React.CSSProperties = {
  borderBottom: "1px solid var(--line)",
};

const inputStyle: React.CSSProperties = {
  background: "var(--bg-elev)",
  color: "var(--ink)",
  border: "1px solid var(--line)",
  borderRadius: "var(--r-2)",
};

export default function SearchAndRedactPage() {
  const viewerRef = useRef<SearchAndRedactHandle>(null);

  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(
    new Set(["social_security_number", "credit_card_number", "email_address"]),
  );
  const [customTerms, setCustomTerms] = useState<string[]>([]);
  const [termInput, setTermInput] = useState("");
  const [useRegex, setUseRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [searchInAnnotations, setSearchInAnnotations] = useState(true);

  const [markCount, setMarkCount] = useState(0);
  const [lastSummary, setLastSummary] = useState<MarkSummary | null>(null);
  const [busy, setBusy] = useState<null | "mark" | "clear" | "apply">(null);
  const [applied, setApplied] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  const togglePreset = (key: string) => {
    setSelectedPresets((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const addTerm = () => {
    const t = termInput.trim();
    if (!t) return;
    if (!customTerms.includes(t)) setCustomTerms((prev) => [...prev, t]);
    setTermInput("");
  };

  const removeTerm = (i: number) => {
    setCustomTerms((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleMark = async () => {
    if (!viewerRef.current) return;
    setBusy("mark");
    try {
      const summary = await viewerRef.current.markForRedaction({
        presetKeys: Array.from(selectedPresets),
        customTerms,
        caseSensitive,
        searchInAnnotations,
        useRegex,
      });
      setLastSummary(summary);
    } finally {
      setBusy(null);
    }
  };

  const handleClear = async () => {
    if (!viewerRef.current) return;
    setBusy("clear");
    try {
      await viewerRef.current.clearMarks();
      setLastSummary(null);
    } finally {
      setBusy(null);
    }
  };

  const handleApply = () => {
    if (!viewerRef.current) return;
    if (markCount === 0) return;
    setShowApplyConfirm(true);
  };

  const handleApplyConfirmed = async () => {
    setShowApplyConfirm(false);
    if (!viewerRef.current) return;
    setBusy("apply");
    try {
      await viewerRef.current.applyRedactions();
      setApplied(true);
      setLastSummary(null);
    } finally {
      setBusy(null);
    }
  };

  const handleReset = () => {
    viewerRef.current?.resetDocument();
    setApplied(false);
    setLastSummary(null);
  };

  const handleDownload = async () => {
    await viewerRef.current?.downloadRedacted();
  };

  const labelByKey = (key: string) =>
    PRESETS.find((p) => p.key === key)?.label ?? key;

  const sidebar = (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* Presets */}
        <section className="p-4" style={sectionBorder}>
          <div className="flex items-center justify-between mb-3">
            <div
              className="text-sm font-semibold"
              style={{ color: "var(--ink)" }}
            >
              Preset Patterns (PII)
            </div>
            <button
              type="button"
              onClick={() =>
                setSelectedPresets(
                  selectedPresets.size === PRESETS.length
                    ? new Set()
                    : new Set(PRESETS.map((p) => p.key)),
                )
              }
              className="text-xs underline decoration-dotted cursor-pointer"
              style={{ color: "var(--ink-3)" }}
            >
              {selectedPresets.size === PRESETS.length
                ? "Deselect all"
                : "Select all"}
            </button>
          </div>
          <div className="space-y-1.5">
            {PRESETS.map((preset) => {
              const checked = selectedPresets.has(preset.key);
              return (
                <label
                  key={preset.key}
                  className="flex items-start gap-2 px-2 py-1.5 cursor-pointer"
                  style={{ borderRadius: "var(--r-1)" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--accent-tint)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePreset(preset.key)}
                    className="mt-0.5 cursor-pointer"
                    style={{ accentColor: "var(--accent)" }}
                  />
                  <span className="flex-1 min-w-0">
                    <span
                      className="block text-sm"
                      style={{ color: "var(--ink)" }}
                    >
                      {preset.label}
                    </span>
                    <span
                      className="block text-xs"
                      style={{ color: "var(--ink-3)" }}
                    >
                      {preset.hint}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* Custom terms */}
        <section className="p-4" style={sectionBorder}>
          <div
            className="text-sm font-semibold mb-3"
            style={{ color: "var(--ink)" }}
          >
            Custom Search Terms
          </div>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={termInput}
              onChange={(e) => setTermInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTerm();
                }
              }}
              placeholder={
                useRegex ? "Regex (e.g. J[a-z]+)" : "Text to redact…"
              }
              className="flex-1 px-3 py-2 text-sm font-mono focus:outline-none"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={addTerm}
              disabled={!termInput.trim()}
              className="btn btn-sm"
            >
              Add
            </button>
          </div>

          {customTerms.length > 0 && (
            <div className="space-y-1 mb-3">
              {customTerms.map((term, i) => (
                <div
                  key={term}
                  className="flex items-center gap-2 px-2 py-1.5 group"
                  style={{
                    background: "var(--bg-elev)",
                    border: "1px solid var(--line)",
                    borderRadius: "var(--r-1)",
                  }}
                >
                  <span
                    className="flex-1 text-sm truncate font-mono"
                    style={{ color: "var(--ink)" }}
                  >
                    {term}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTerm(i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    style={{ color: "var(--ink-4)" }}
                    aria-label={`Remove "${term}"`}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <title>Remove</title>
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 text-xs" style={{ color: "var(--ink-2)" }}>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useRegex}
                onChange={(e) => setUseRegex(e.target.checked)}
                className="cursor-pointer"
                style={{ accentColor: "var(--accent)" }}
              />
              Interpret terms as regular expressions
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
                className="cursor-pointer"
                style={{ accentColor: "var(--accent)" }}
              />
              Case sensitive (text search)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={searchInAnnotations}
                onChange={(e) => setSearchInAnnotations(e.target.checked)}
                className="cursor-pointer"
                style={{ accentColor: "var(--accent)" }}
              />
              Include annotation text
            </label>
          </div>
        </section>

        {/* Last run summary */}
        {lastSummary && (
          <section className="p-4" style={sectionBorder}>
            <div
              className="text-sm font-semibold mb-2"
              style={{ color: "var(--ink)" }}
            >
              Last Run
            </div>
            <div className="text-xs mb-2" style={{ color: "var(--ink-3)" }}>
              {lastSummary.totalMarks} redaction
              {lastSummary.totalMarks === 1 ? "" : "s"} marked
            </div>
            <div className="space-y-1">
              {lastSummary.byQuery.map((q) => (
                <div
                  key={`${q.type}:${q.query}`}
                  className="flex items-center justify-between text-xs"
                >
                  <span
                    className="truncate font-mono"
                    style={{ color: "var(--ink-2)" }}
                  >
                    {q.type === "preset" ? labelByKey(q.query) : q.query}
                  </span>
                  <span
                    className="tabular-nums ml-2"
                    style={{ color: "var(--ink-3)" }}
                  >
                    {q.count}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Action bar */}
      <div
        className="p-4 space-y-2"
        style={{ borderTop: "1px solid var(--line)" }}
      >
        <div
          className="flex items-center justify-between text-xs mb-1"
          style={{ color: "var(--ink-3)" }}
        >
          <span>Pending redactions</span>
          <span className="tabular-nums font-semibold">{markCount}</span>
        </div>

        <button
          type="button"
          onClick={handleMark}
          disabled={
            busy !== null ||
            (selectedPresets.size === 0 && customTerms.length === 0)
          }
          className="btn btn-sm w-full"
        >
          {busy === "mark" ? "Marking…" : "Mark for Redaction"}
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={busy !== null || markCount === 0}
            className="btn ghost btn-sm flex-1"
          >
            {busy === "clear" ? "Clearing…" : "Clear Marks"}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={busy !== null || markCount === 0}
            className="btn btn-sm flex-1"
            style={{
              background: "var(--code-coral)",
              borderColor: "var(--code-coral)",
              color: "#fff",
            }}
          >
            {busy === "apply" ? "Applying…" : "Apply"}
          </button>
        </div>

        {applied && (
          <div
            className="flex gap-2 pt-2"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <button
              type="button"
              onClick={handleDownload}
              className="btn ghost btn-sm flex-1"
            >
              Download Redacted PDF
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="btn ghost btn-sm flex-1"
            >
              Reset Document
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <SampleFrame
        title="Search & Redact"
        description="Permanently redact sensitive information using preset patterns (SSN, credit card, email, phone, etc.), custom search terms, or regular expressions. Includes toolbar tools for manual rectangle and text-highlighter redactions."
        sidebar={sidebar}
        sidebarSide="left"
        sidebarWidth={384}
        wide
      >
        <Viewer
          ref={viewerRef}
          onRedactionCountChange={setMarkCount}
          onApplied={() => setApplied(true)}
        />
      </SampleFrame>
      <ConfirmDialog
        open={showApplyConfirm}
        title="Apply redactions?"
        message={`Apply ${markCount} redaction${markCount === 1 ? "" : "s"}? This permanently removes the underlying content from the in-memory document.`}
        confirmLabel="Apply"
        destructive
        onConfirm={handleApplyConfirmed}
        onCancel={() => setShowApplyConfirm(false)}
      />
    </>
  );
}
