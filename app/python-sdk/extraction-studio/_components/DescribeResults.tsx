"use client";
import { useState } from "react";
import type { DescribeResult } from "../lib/describe";
import { copyText, downloadText } from "../lib/download";
import { providerLabel } from "../lib/provenance";
import { Segmented } from "./Segmented";

type DescribeView = "text" | "json" | "code";

// Single source of truth for both what the pane shows AND what Copy/Download
// hand over. Two independent literals here previously let the pane say
// "unavailable" while `payload()` handed Copy/Download an empty string — the
// buttons contradicting the screen. Every other panel's Copy/Download match
// what is displayed; this constant is what keeps this one from drifting back
// out of that contract.
const CODE_UNAVAILABLE = "# code snippet unavailable from this backend";

const FILE_FOR_VIEW: Record<DescribeView, { type: string; name: string }> = {
  text: { type: "text/plain", name: "description.txt" },
  json: { type: "application/json", name: "description.json" },
  code: { type: "text/x-python", name: "describe.py" },
};

export function DescribeResults({ result }: { result: DescribeResult }) {
  const [view, setView] = useState<DescribeView>("text");

  const empty = !result.text.trim();
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
      <div className="results-meta results-meta-grid">
        {result.timingMs != null && (
          <span className="mono muted">
            Elapsed time: {(result.timingMs / 1000).toFixed(1)}s
          </span>
        )}
        {/* First of the option echoes, because it is the one the reader cannot
            recover from the output itself: two providers describing the same
            page produce prose that reads equally plausible. */}
        <span className="mono muted">{providerLabel(result.provider)}</span>
        <span className="mono muted">{result.level} detail</span>
        <span className="mono muted">
          {result.promptUsed === "(default)" ? "SDK prompt" : "custom prompt"}
        </span>
        {/* A property of the SDK path, not a bug: Vision.describe() reads ONE
            page image, and describe_image uses the max_pages=1 helper. A
            prospect should meet that here rather than infer it from a
            multi-page document producing one paragraph. */}
        <span className="mono muted">page 1 only</span>
      </div>

      {/* Outside the empty branch on purpose, so a run that returns no text
          still offers the Code view. */}
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
      ) : empty ? (
        <div className="callout" role="status">
          <span className="callout-label">No description returned</span>
          <p>
            The model returned nothing for this page. Try the Detailed level, or
            a prompt that says what you want described.
          </p>
        </div>
      ) : (
        // Prose, not a monospace dump: this is the studio's only results view
        // whose content is meant to be READ.
        <p className="describe-text">{result.text}</p>
      )}
    </div>
  );
}
