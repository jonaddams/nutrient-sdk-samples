"use client";
import { useState } from "react";
import { copyText, downloadText } from "../lib/download";
import type { MarkdownResult } from "../lib/markdown";
import { providerLabel } from "../lib/provenance";
import { Segmented } from "./Segmented";

type MarkdownView = "source" | "json" | "code";

// Single source of truth for what the pane shows AND what Copy/Download hand
// over. Two independent literals previously let DescribeResults' pane say
// "unavailable" while payload() handed Copy an empty string — the buttons
// contradicting the screen. Keep them reading from this one constant.
const CODE_UNAVAILABLE = "# code snippet unavailable from this backend";

const FILE_FOR_VIEW: Record<MarkdownView, { type: string; name: string }> = {
  source: { type: "text/markdown", name: "document.md" },
  json: { type: "application/json", name: "markdown.json" },
  code: { type: "text/x-python", name: "markdown.py" },
};

function pagesLabel(processed: number, total: number): string {
  // Distinct numbers when they differ: pages run fail-fast, so a partial
  // result is a real outcome and must not read as a complete one.
  if (processed !== total) return `${processed} of ${total} pages`;
  return `${total} page${total === 1 ? "" : "s"}`;
}

export function MarkdownResults({ result }: { result: MarkdownResult }) {
  const [view, setView] = useState<MarkdownView>("source");

  const empty = !result.markdown.trim();
  // The JSON view drops `code`: the snippet has its own segment.
  const { code, ...resultJson } = result;

  const payload = () => {
    if (view === "code") return code ?? CODE_UNAVAILABLE;
    if (view === "json") return JSON.stringify(resultJson, null, 2);
    return result.markdown;
  };

  const download = () => {
    const { type, name } = FILE_FOR_VIEW[view];
    downloadText(payload(), name, type);
  };

  return (
    <div>
      <div className="results-meta results-meta-grid">
        {result.timingMs != null && (
          <span className="mono muted">
            Elapsed time: {(result.timingMs / 1000).toFixed(1)}s
          </span>
        )}
        <span className="mono muted">{providerLabel(result.provider)}</span>
        <span className="mono muted">
          {pagesLabel(result.processedPages, result.totalPages)}
        </span>
        <span className="mono muted">{result.charCount} chars</span>
      </div>

      {/* Outside the empty branch on purpose, so a run that returns no markdown
          still offers the Code view. */}
      <div className="panel-row-h panel-row results-actions">
        <Segmented
          label="View"
          options={[
            { label: "Source", value: "source" },
            { label: "JSON", value: "json" },
            { label: "Code", value: "code" },
          ]}
          value={view}
          onChange={setView}
        />
        <div className="results-actions-btns">
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => copyText(payload())}
          >
            Copy
          </button>
          <button type="button" className="btn ghost sm" onClick={download}>
            Download
          </button>
        </div>
      </div>

      {view === "code" ? (
        <pre className="ocr-text mono">{code ?? CODE_UNAVAILABLE}</pre>
      ) : view === "json" ? (
        <pre className="ocr-text mono">
          {JSON.stringify(resultJson, null, 2)}
        </pre>
      ) : empty ? (
        <div className="callout" role="status">
          <span className="callout-label">No markdown returned</span>
          <p>
            The model returned nothing for this document. Try the other
            provider, or a document with more text on the page.
          </p>
        </div>
      ) : (
        <pre className="ocr-text mono">{result.markdown}</pre>
      )}
    </div>
  );
}
