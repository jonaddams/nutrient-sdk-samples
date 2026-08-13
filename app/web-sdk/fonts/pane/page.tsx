"use client";

/**
 * A single full-bleed viewer, meant to be embedded in an <iframe>.
 *
 * NutrientViewer snapshots its Standalone configuration (which includes
 * customFonts) on first load and asserts if a later load() on the SAME page
 * passes a different configuration. Two <Viewer> instances side by side in
 * one document therefore cannot be given different customFonts — one of
 * them will always throw. Giving each pane its own document (via an
 * iframe navigated to this route) gives each its own JS context and its own
 * NutrientViewer configuration, so the assertion never fires.
 *
 * Reads two query params instead of props, since props can't cross an
 * iframe boundary:
 *   doc   - a public path to the document to render, e.g.
 *           "/documents/dotnet-sdk/acme-sow.docx"
 *   fonts - optional comma-separated font names to supply. Omitted or
 *           empty means render with no fonts supplied.
 */

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Viewer = dynamic(() => import("../viewer"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center h-screen text-sm"
      style={{ color: "var(--ink-4)" }}
    >
      Loading viewer...
    </div>
  ),
});

export default function FontsPanePage() {
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [fonts, setFonts] = useState<string[]>([]);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Parse query params on mount. Reading window.location directly (rather
  // than useSearchParams) avoids the App Router's Suspense-boundary
  // requirement for a page this small.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDocUrl(params.get("doc"));
    setFonts(
      (params.get("fonts") ?? "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
    );
  }, []);

  useEffect(() => {
    if (!docUrl) return;
    let cancelled = false;

    fetch(docUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load document (${res.status})`);
        return res.blob();
      })
      .then((b) => {
        if (!cancelled) setBlob(b);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [docUrl]);

  if (error) {
    return (
      <div
        className="flex items-center justify-center h-screen text-sm text-center p-4"
        style={{ color: "var(--code-coral)" }}
      >
        {error}
      </div>
    );
  }

  if (!docUrl || !blob) {
    return (
      <div
        className="flex items-center justify-center h-screen text-sm"
        style={{ color: "var(--ink-4)" }}
      >
        Loading document...
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100vh" }}>
      <Viewer blob={blob} supplyFonts={fonts} />
    </div>
  );
}
