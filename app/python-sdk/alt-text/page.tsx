"use client";

import { useMemo, useState } from "react";
import { ExtractionResultPanel } from "../_components/ExtractionResultPanel";
import { PythonSampleHeader } from "../_components/PythonSampleHeader";

const API_BASE =
  process.env.NEXT_PUBLIC_PYTHON_SDK_API_URL || "http://localhost:8080";

const SAMPLE_IMAGES = [
  {
    label: "Heavenly Hamburgers (photo)",
    path: "/documents/heavenly-hamburgers-recipe.jpeg",
    filename: "heavenly-hamburgers-recipe.jpeg",
  },
];

type Level = "standard" | "detailed";

interface DescribeResult {
  engine: string;
  filename: string;
  provider: string;
  level: string;
  promptUsed: string;
  text: string;
}

async function describe(
  imgPath: string,
  filename: string,
  level: Level,
): Promise<DescribeResult> {
  const response = await fetch(imgPath);
  const blob = await response.blob();
  const file = new File([blob], filename);
  const formData = new FormData();
  formData.append("file", file);
  formData.append("provider", "claude");
  formData.append("level", level);

  const res = await fetch(`${API_BASE}/api/extraction/describe`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const detail = await res
      .json()
      .then((b) => (typeof b?.detail === "string" ? b.detail : null))
      .catch(() => null);
    throw new Error(detail ?? `API returned ${res.status}`);
  }
  return (await res.json()) as DescribeResult;
}

export default function AltTextPage() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [level, setLevel] = useState<Level>("detailed");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<DescribeResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = SAMPLE_IMAGES[selectedIndex];

  const run = async (mode: "single" | "compare") => {
    setProcessing(true);
    setError(null);
    setResults(null);
    try {
      if (mode === "compare") {
        const [std, det] = await Promise.all([
          describe(selected.path, selected.filename, "standard"),
          describe(selected.path, selected.filename, "detailed"),
        ]);
        setResults([std, det]);
      } else {
        setResults([await describe(selected.path, selected.filename, level)]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Description failed");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `${selected.filename.replace(/\.[^.]+$/, "")}-alt-text.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const formatted = useMemo(
    () => (
      <div className="p-4">
        <div
          className={`grid gap-4 ${results && results.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}
        >
          {results?.map((r) => (
            <div
              key={r.level}
              className="rounded-lg border border-[var(--line)] p-3"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ink-3)] mb-2">
                {r.level} description
              </div>
              <p className="text-sm text-[var(--ink-2)] leading-relaxed whitespace-pre-wrap">
                {r.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    ),
    [results],
  );

  const raw = useMemo(
    () => (
      <pre className="p-4 text-xs text-[var(--ink-3)] whitespace-pre-wrap font-mono leading-relaxed">
        {results ? JSON.stringify(results, null, 2) : ""}
      </pre>
    ),
    [results],
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <PythonSampleHeader
        title="Image Alt Text"
        description="Generate WCAG-style accessibility descriptions for images at standard or detailed level, via Vision.describe() with Claude."
      />
      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-[var(--bg-elev)] rounded-xl shadow-lg border border-[var(--line)] overflow-hidden h-[calc(100vh-12rem)]">
          <div className="flex h-full">
            <div className="w-80 border-r border-[var(--line)] bg-[var(--bg-elev)] flex flex-col flex-shrink-0">
              <div className="p-4 border-b border-[var(--line)]">
                <h3 className="text-sm font-semibold text-[var(--ink-2)]">
                  Source Image
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <select
                  aria-label="Source image"
                  value={selectedIndex}
                  onChange={(e) => {
                    setSelectedIndex(Number(e.target.value));
                    setResults(null);
                    setError(null);
                  }}
                  className="w-full px-3 py-2 text-sm rounded-md border border-[var(--line-strong)] bg-[var(--bg-elev)] text-[var(--ink)]"
                >
                  {SAMPLE_IMAGES.map((img, i) => (
                    <option key={img.path} value={i}>
                      {img.label}
                    </option>
                  ))}
                </select>
                <div>
                  <span className="block text-xs font-medium text-[var(--ink-3)] mb-1">
                    Detail level
                  </span>
                  <div className="flex rounded-md border border-[var(--line-strong)] overflow-hidden">
                    {(["standard", "detailed"] as Level[]).map((lv) => (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => setLevel(lv)}
                        className={`flex-1 px-2.5 py-1.5 text-xs font-medium capitalize cursor-pointer ${
                          level === lv
                            ? "bg-[var(--surface)] text-[var(--ink)]"
                            : "text-[var(--ink-3)] hover:bg-[var(--surface)]"
                        }`}
                      >
                        {lv}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => run("single")}
                  disabled={processing}
                  className="w-full px-4 py-2.5 text-sm font-semibold rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  {processing ? "Generating..." : "Generate Description"}
                </button>
                <button
                  type="button"
                  onClick={() => run("compare")}
                  disabled={processing}
                  className="w-full px-4 py-2 text-sm font-medium rounded-md border border-[var(--line-strong)] text-[var(--ink-2)] hover:bg-[var(--surface)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Compare standard vs detailed
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
                className={`relative ${results ? "h-[50%]" : "flex-1"} flex items-center justify-center bg-[var(--surface)] overflow-auto`}
              >
                {processing && (
                  <div
                    role="status"
                    aria-label="Generating description, please wait"
                    className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-black/60"
                  >
                    <div className="text-center space-y-2">
                      <div className="inline-block w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-[var(--ink-3)]">
                        Generating description...
                      </p>
                    </div>
                  </div>
                )}
                {/* biome-ignore lint/performance/noImgElement: static sample image shown as-is; Next.js Image is not needed here */}
                <img
                  src={selected.path}
                  alt="Sample to be described"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              {results && (
                <div className="border-t border-[var(--line)] h-[50%]">
                  <ExtractionResultPanel
                    title="Generated Alt Text"
                    stats={
                      results.length > 1
                        ? "standard + detailed"
                        : results[0].level
                    }
                    primaryLabel="Description"
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
