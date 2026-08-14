"use client";
import { useState } from "react";
import { copyText, downloadText } from "../lib/download";
import { elapsedLabel, type TextResult } from "../lib/text";
import { Segmented } from "./Segmented";

type TextView = "text" | "json" | "code";

// Single source of truth for what the pane shows AND what Copy/Download hand
// over, mirroring MarkdownResults. Two independent literals previously let a
// pane say "unavailable" while payload() handed Copy an empty string.
const CODE_UNAVAILABLE = "# code snippet unavailable from this backend";

const FILE_FOR_VIEW: Record<TextView, { type: string; name: string }> = {
  text: { type: "text/plain", name: "text.txt" },
  json: { type: "application/json", name: "text.json" },
  code: { type: "text/x-python", name: "text.py" },
};

export function TextResults({
  result,
  onUseOcr,
}: {
  result: TextResult;
  onUseOcr: () => void;
}) {
  const [view, setView] = useState<TextView>("text");

  // The JSON view drops `code`: the snippet has its own segment.
  const { code, ...resultJson } = result;

  const payload = () => {
    if (view === "code") return code ?? CODE_UNAVAILABLE;
    if (view === "json") return JSON.stringify(resultJson, null, 2);
    return result.text;
  };

  const download = () => {
    const { type, name } = FILE_FOR_VIEW[view];
    downloadText(payload(), name, type);
  };

  return (
    <div>
      {/* Four items, which is the budget: .results-meta-grid is `1fr auto`,
          so a fifth wraps onto its own row. */}
      <div className="results-meta results-meta-grid">
        {result.timingMs != null && (
          <span className="mono muted">
            Elapsed time: {elapsedLabel(result.timingMs)}
          </span>
        )}
        <span className="mono muted">
          {result.totalPages} page{result.totalPages === 1 ? "" : "s"}
        </span>
        <span className="mono muted">
          {result.wordCount.toLocaleString("en-US")} words
        </span>
        <span className="mono muted">
          {result.charCount.toLocaleString("en-US")} chars
        </span>
      </div>

      {/* Outside the empty branch on purpose — TablesResults and
          DescribeResults do the same and OcrResults does not. A run that
          returned nothing is when a prospect most wants the Code view. */}
      <div className="panel-row-h panel-row results-actions">
        <Segmented
          label="View"
          options={[
            { label: "Text", value: "text" },
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
      ) : !result.hasTextLayer ? (
        // Keyed to the backend's flag, never to `text` — the server owns this
        // decision and the two must not be able to disagree.
        <div className="callout" role="status">
          <span className="callout-label">No text layer in this document</span>
          <p>
            This page is an image, so its words exist only as pixels — there is
            no embedded text to pull out. Adaptive OCR reads them instead, and
            needs no API key either.
          </p>
          <button type="button" className="btn sm" onClick={onUseOcr}>
            Switch to Adaptive OCR
          </button>
        </div>
      ) : (
        <pre className="ocr-text mono">{result.text}</pre>
      )}
    </div>
  );
}
