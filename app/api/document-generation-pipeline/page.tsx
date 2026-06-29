// app/api/document-generation-pipeline/page.tsx
"use client";

import dynamic from "next/dynamic";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div
          className="inline-block animate-spin rounded-full h-8 w-8 mb-4"
          style={{
            border: "2px solid var(--line)",
            borderBottomColor: "var(--accent)",
          }}
        />
        <p style={{ color: "var(--ink-3)" }}>Loading…</p>
      </div>
    </div>
  ),
});

export default function DocumentGenerationPipelinePage() {
  return <Viewer />;
}
