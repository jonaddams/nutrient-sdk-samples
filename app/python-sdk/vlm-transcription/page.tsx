"use client";

import { useCallback, useState } from "react";
import { PdfViewer } from "../../java-sdk/_components/PdfViewer";
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

const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL || "http://localhost:8080";

const SAMPLE_DOCUMENTS = [
  {
    label: "Apricot Cake recipe (cursive, aged paper)",
    path: "/documents/handwritten-cursive-apricot-cake-recipe.jpg",
    filename: "apricot-cake-recipe.jpg",
  },
  {
    label: "Dear Magnus thank-you note (modern cursive)",
    path: "/documents/handwritten-cursive-dear-magnus-thank-you-note.jpg",
    filename: "dear-magnus-thank-you-note.jpg",
  },
  {
    label: "Heavenly Hamburgers recipe (print, decorative card)",
    path: "/documents/heavenly-hamburgers-recipe.jpeg",
    filename: "heavenly-hamburgers-recipe.jpeg",
  },
  {
    label: "Employment Application (print, structured form)",
    path: "/documents/handwritten-employment-application.jpg",
    filename: "handwritten-employment-application.jpg",
  },
];

const DEFAULT_PROMPT =
  "Transcribe all handwritten text in this image verbatim. Preserve line breaks. Do not describe the image; only return the transcribed text. If a word is unreadable, write [illegible] in its place.";

const TOOLBAR_ITEMS = [
  { type: "zoom-out" },
  { type: "zoom-in" },
  { type: "zoom-mode" },
];

interface DescribeResult {
  engine: string;
  filename: string;
  provider: string;
  promptUsed: string;
  text: string;
}

export default function VlmTranscriptionPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [mode, setMode] = useState<ProviderMode>("claude");
  const {
    runAll,
    loading: processing,
    outcomes,
    reset,
  } = useProviderRun<DescribeResult>();
  const entries = outcomeEntries(outcomes);

  const selected = SAMPLE_DOCUMENTS[selectedIndex] as (typeof SAMPLE_DOCUMENTS)[number];

  const handleTranscribe = () =>
    runAll(mode, async (provider: Provider) => {
      const sampleRes = await fetch(selected.path);
      const blob = await sampleRes.blob();
      const file = new File([blob], selected.filename);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("prompt", prompt);
      formData.append("provider", provider);

      const apiRes = await fetch(`${API_BASE}/api/extraction/describe`, {
        method: "POST",
        body: formData,
      });

      if (!apiRes.ok) {
        const detail = await apiRes
          .json()
          .then((b) => (typeof b?.detail === "string" ? b.detail : null))
          .catch(() => null);
        throw new Error(detail ?? `API returned ${apiRes.status}`);
      }

      return (await apiRes.json()) as DescribeResult;
    });

  const handleDocumentChange = useCallback(
    (index: number) => {
      setSelectedIndex(index);
      reset();
    },
    [reset],
  );

  const handleResetPrompt = useCallback(() => {
    setPrompt(DEFAULT_PROMPT);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PythonSampleHeader
        title="VLM Transcription"
        description="Transcribe handwriting via the Nutrient SDK's Vision.describe() routed through Claude or OpenAI. Edit the prompt to customize what the model does — transcription, summarization, structured extraction."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-[var(--bg-elev)] rounded-xl shadow-lg border border-[var(--line)] overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            {/* Left Panel — Controls */}
            <div className="w-96 border-r border-[var(--line)] bg-[var(--bg-elev)] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--line)]">
                <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                  Source &amp; Prompt
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label
                    htmlFor="source-document-select"
                    className="block text-xs font-medium text-[var(--ink-3)] mb-1"
                  >
                    Source document
                  </label>
                  <select
                    id="source-document-select"
                    value={selectedIndex}
                    onChange={(e) =>
                      handleDocumentChange(Number(e.target.value))
                    }
                    className="w-full px-3 py-2 text-sm rounded-md border border-[var(--line-strong)] bg-[var(--bg-elev)] text-[var(--ink)]"
                  >
                    {SAMPLE_DOCUMENTS.map((doc, i) => (
                      <option key={doc.path} value={i}>
                        {doc.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label
                      htmlFor="prompt-input"
                      className="block text-xs font-medium text-[var(--ink-3)]"
                    >
                      Prompt
                    </label>
                    <button
                      type="button"
                      onClick={handleResetPrompt}
                      className="text-[10px] text-[var(--accent)] hover:underline"
                    >
                      Reset to default
                    </button>
                  </div>
                  <textarea
                    id="prompt-input"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 text-xs rounded-md border border-[var(--line-strong)] bg-[var(--bg-elev)] text-[var(--ink)] font-mono leading-relaxed"
                  />
                  <p className="text-[10px] text-[var(--ink-4)] mt-1">
                    Try swapping the transcription prompt for "Summarize this
                    note" or "Extract the ingredients as a JSON list."
                  </p>
                </div>

                <ProviderToggle
                  value={mode}
                  onChange={setMode}
                  disabled={processing}
                />

                <div className="text-[11px] text-[var(--ink-3)] space-y-1">
                  <div className="flex justify-between">
                    <span>Endpoint</span>
                    <span className="font-mono text-[var(--ink-2)]">
                      POST /api/extraction/describe
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-[var(--line)] space-y-2">
                <button
                  type="button"
                  onClick={handleTranscribe}
                  disabled={processing || !prompt.trim()}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {processing ? "Transcribing…" : "Transcribe"}
                </button>
              </div>
            </div>

            {/* Right Panel — Viewer + Result */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div
                className={`relative ${entries.length > 0 ? "h-[50%]" : "flex-1"} border-b border-[var(--line)]`}
              >
                {processing && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60">
                    <div className="text-center space-y-2">
                      <div className="inline-block w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-[var(--ink-3)]">
                        Asking the VLM to transcribe…
                      </p>
                    </div>
                  </div>
                )}

                <PdfViewer
                  document={selected.path}
                  toolbarItems={TOOLBAR_ITEMS}
                />
              </div>

              {entries.length > 0 && (
                <div className="h-[50%] flex flex-col lg:flex-row">
                  {entries.map(([provider, outcome]) => (
                    <div
                      key={provider}
                      className="flex-1 min-w-0 min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r last:border-0 border-[var(--line)]"
                    >
                      {outcome.status === "error" ? (
                        <ProviderErrorCard
                          provider={provider}
                          message={outcome.message}
                        />
                      ) : (
                        <>
                          <div className="flex items-center justify-between px-4 py-2 bg-[var(--surface)] border-b border-[var(--line)] flex-shrink-0">
                            <div className="flex items-center gap-3">
                              <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                                Transcription
                              </h3>
                              <span className="text-xs text-[var(--ink-3)]">
                                provider:{" "}
                                <span className="font-medium text-[var(--ink-2)]">
                                  {PROVIDER_LABELS[provider]}
                                </span>
                                {" · "}
                                {formatTiming(outcome.ms)}
                                {" · "}
                                {outcome.data.text.length} chars
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 overflow-auto p-4 bg-[var(--bg-elev)]">
                            <pre className="text-sm text-[var(--ink)] whitespace-pre-wrap leading-relaxed font-sans">
                              {outcome.data.text}
                            </pre>
                          </div>
                        </>
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
