"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
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
  {
    key: "email_address",
    label: "Email Addresses",
    hint: "name@domain.tld",
  },
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
  {
    key: "date",
    label: "Dates",
    hint: "mm/dd/yyyy, dd-mm-yy, etc.",
  },
  {
    key: "url",
    label: "URLs",
    hint: "http, https, or www links",
  },
  {
    key: "us_zip_code",
    label: "US ZIP Codes",
    hint: "00000 or 00000-0000",
  },
  {
    key: "vin",
    label: "Vehicle Identification Numbers",
    hint: "17-character VINs",
  },
  {
    key: "ipv4",
    label: "IP Addresses (v4)",
    hint: "0.0.0.0 format",
  },
];

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
    if (customTerms.includes(t)) {
      setTermInput("");
      return;
    }
    setCustomTerms((prev) => [...prev, t]);
    setTermInput("");
  };

  const removeTerm = (idx: number) => {
    setCustomTerms((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMark = async () => {
    if (!viewerRef.current) return;
    if (selectedPresets.size === 0 && customTerms.length === 0) return;
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

  const handleApply = async () => {
    if (!viewerRef.current) return;
    if (markCount === 0) return;
    const ok = window.confirm(
      `Apply ${markCount} redaction${markCount === 1 ? "" : "s"}? This permanently removes the underlying content from the in-memory document.`,
    );
    if (!ok) return;
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

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Search & Redact"
        description="Permanently redact sensitive information using preset patterns (SSN, credit card, email, phone, etc.), custom search terms, or regular expressions. Includes toolbar tools for manual rectangle and text-highlighter redactions."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-96 border-r border-[var(--warm-gray-400)] bg-white dark:bg-[#2a2020] flex flex-col flex-shrink-0">
              <div className="flex-1 overflow-y-auto">
                {/* Presets */}
                <section className="p-4 border-b border-[var(--warm-gray-400)]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
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
                      className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline decoration-dotted cursor-pointer"
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
                          className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-[#1a1414] cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePreset(preset.key)}
                            className="mt-0.5 accent-[var(--digital-pollen)] cursor-pointer"
                          />
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm text-gray-800 dark:text-gray-200">
                              {preset.label}
                            </span>
                            <span className="block text-xs text-gray-500 dark:text-gray-400">
                              {preset.hint}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>

                {/* Custom terms */}
                <section className="p-4 border-b border-[var(--warm-gray-400)]">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
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
                      className="flex-1 px-3 py-2 border border-[var(--warm-gray-400)] rounded-md bg-white dark:bg-[#1a1414] text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--digital-pollen)] text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={addTerm}
                      disabled={!termInput.trim()}
                      className="px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      style={{
                        background: termInput.trim()
                          ? "var(--digital-pollen)"
                          : "var(--warm-gray-400)",
                        color: "var(--black)",
                      }}
                    >
                      Add
                    </button>
                  </div>

                  {customTerms.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {customTerms.map((term, i) => (
                        <div
                          key={term}
                          className="flex items-center gap-2 px-2 py-1.5 rounded bg-gray-50 dark:bg-[#1a1414] border border-gray-200 dark:border-gray-700 group"
                        >
                          <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 truncate font-mono">
                            {term}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeTerm(i)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
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

                  <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useRegex}
                        onChange={(e) => setUseRegex(e.target.checked)}
                        className="accent-[var(--digital-pollen)] cursor-pointer"
                      />
                      Interpret terms as regular expressions
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={caseSensitive}
                        onChange={(e) => setCaseSensitive(e.target.checked)}
                        className="accent-[var(--digital-pollen)] cursor-pointer"
                      />
                      Case sensitive (text search)
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={searchInAnnotations}
                        onChange={(e) =>
                          setSearchInAnnotations(e.target.checked)
                        }
                        className="accent-[var(--digital-pollen)] cursor-pointer"
                      />
                      Include annotation text
                    </label>
                  </div>
                </section>

                {/* Last run summary */}
                {lastSummary && (
                  <section className="p-4 border-b border-[var(--warm-gray-400)]">
                    <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">
                      Last Run
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                      {lastSummary.totalMarks} redaction
                      {lastSummary.totalMarks === 1 ? "" : "s"} marked
                    </div>
                    <div className="space-y-1">
                      {lastSummary.byQuery.map((q) => (
                        <div
                          key={`${q.type}:${q.query}`}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="truncate text-gray-700 dark:text-gray-300 font-mono">
                            {q.type === "preset"
                              ? labelByKey(q.query)
                              : q.query}
                          </span>
                          <span className="text-gray-500 dark:text-gray-400 tabular-nums ml-2">
                            {q.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Action bar */}
              <div className="p-4 border-t border-[var(--warm-gray-400)] space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>Pending redactions</span>
                  <span className="tabular-nums font-semibold">
                    {markCount}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleMark}
                  disabled={
                    busy !== null ||
                    (selectedPresets.size === 0 && customTerms.length === 0)
                  }
                  className="w-full px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  style={{
                    background: "var(--digital-pollen)",
                    color: "var(--black)",
                  }}
                >
                  {busy === "mark" ? "Marking…" : "Mark for Redaction"}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={busy !== null || markCount === 0}
                    className="flex-1 px-3 py-2 rounded-md text-sm font-medium border border-[var(--warm-gray-400)] bg-white dark:bg-[#1a1414] text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2020] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {busy === "clear" ? "Clearing…" : "Clear Marks"}
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    disabled={busy !== null || markCount === 0}
                    className="flex-1 px-3 py-2 rounded-md text-sm font-medium bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {busy === "apply" ? "Applying…" : "Apply"}
                  </button>
                </div>

                {applied && (
                  <div className="flex gap-2 pt-2 border-t border-[var(--warm-gray-400)]">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex-1 px-3 py-2 rounded-md text-sm font-medium border border-[var(--warm-gray-400)] bg-white dark:bg-[#1a1414] text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2020] cursor-pointer"
                    >
                      Download Redacted PDF
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex-1 px-3 py-2 rounded-md text-sm font-medium border border-[var(--warm-gray-400)] bg-white dark:bg-[#1a1414] text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2020] cursor-pointer"
                    >
                      Reset Document
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Viewer */}
            <div className="flex-1 min-w-0">
              <Viewer
                ref={viewerRef}
                onRedactionCountChange={setMarkCount}
                onApplied={() => setApplied(true)}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
