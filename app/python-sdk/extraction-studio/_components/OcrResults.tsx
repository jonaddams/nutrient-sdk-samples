"use client";
import { useEffect, useState } from "react";
import type { OcrResult } from "../lib/ocr";
import { Segmented } from "./Segmented";
import { Toggle } from "./Toggle";

/** Bands a confidence score into the three tones `.match-dot` already styles.
 *
 *  A sibling of matchDotTone() in StructuredResults, NOT a reuse of it: that one
 *  keys on match strings ("exact", "not_found") while this takes a float.
 *  Conflating the two would mean one function with two unrelated input types. */
export function confidenceTone(n: number): "good" | "partial" | "bad" {
  if (n >= 0.85) return "good";
  if (n >= 0.5) return "partial";
  return "bad";
}

/** Fill colour for a region box, so the overlay shows WHERE OCR was unsure.
 *  This is why OcrResults has no colour picker: a user-chosen colour would
 *  fight the confidence tint.
 *
 *  Values MUST match `.match-dot.good/.partial/.bad` in styles.css — that is
 *  the source of truth for these three tones. They used to diverge (this
 *  function had its own brighter #22c55e/#eab308/#ef4444), so the dot next to
 *  an element and the box drawn for that same element were visibly different
 *  greens. */
export function confidenceHex(n: number): string {
  const tone = confidenceTone(n);
  if (tone === "good") return "#4a9d6a";
  if (tone === "partial") return "#c9a227";
  return "#c8553c";
}

export function OcrResults({
  result,
  activeIndex,
  onSelectElement,
  showRegions,
  onShowRegionsChange,
}: {
  result: OcrResult;
  activeIndex: number | null;
  onSelectElement: (index: number) => void;
  showRegions: boolean;
  onShowRegionsChange: (value: boolean) => void;
}) {
  const isMarkdown = result.config.outputFormat === "markdown";
  // Seeded from the CURRENT result so a fresh mount already shows the right
  // pane, then kept in sync below whenever a run flips markdown-ness — this
  // is a real component instance reused across runs (page.tsx renders it
  // with no `key`), not remounted per result.
  const [view, setView] = useState(isMarkdown ? "markdown" : "elements");
  useEffect(() => {
    setView(isMarkdown ? "markdown" : "elements");
  }, [isMarkdown]);
  // Defensive, not just decorative: a future backend change that narrows this
  // shape again should degrade (an empty table) rather than blank the whole
  // panel the way the markdown branch's missing textElements once did.
  const textElements = result.textElements ?? [];
  const empty = textElements.length === 0 && !result.markdown;
  // The JSON view deliberately drops `code`: the snippet has its own segment.
  const { code, ...resultJson } = result;

  // Keyed to the view, so what the button hands over is what is on screen —
  // the same contract as StructuredResults' actions row.
  const payload = () => {
    if (view === "code") return code ?? "";
    if (view === "markdown") return result.markdown ?? "";
    if (view === "text") return result.fullText ?? "";
    return JSON.stringify(resultJson, null, 2);
  };

  const FILE_FOR_VIEW: Record<string, { type: string; name: string }> = {
    code: { type: "text/x-python", name: "ocr.py" },
    markdown: { type: "text/markdown", name: "ocr.md" },
    text: { type: "text/plain", name: "ocr.txt" },
  };

  const download = () => {
    const { type, name } = FILE_FOR_VIEW[view] ?? {
      type: "application/json",
      name: "ocr.json",
    };
    const url = URL.createObjectURL(new Blob([payload()], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    // Deferred: revoking synchronously races the browser's internal blob fetch
    // for the download in some browsers (notably older Safari).
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div>
      <div className="results-meta">
        <span className="mono muted">
          {(result.timingMs / 1000).toFixed(1)}s
        </span>
        {/* Markdown output carries no elements and no per-element
            confidence, so both figures are structurally zero in that mode.
            Rendering them anyway was honest and read as a failed run —
            "0 elements · 0% avg confidence" is what a prospect sees first
            after flipping the Output control. Timing still means something,
            so it stays. */}
        {!isMarkdown && (
          <>
            <span className="mono muted">
              {result.statistics?.textElements ?? 0} elements
            </span>
            <span className="mono muted">
              {Math.round((result.statistics?.averageConfidence ?? 0) * 100)}%
              avg confidence
            </span>
          </>
        )}
        <Toggle
          checked={showRegions}
          onChange={onShowRegionsChange}
          label="Show regions"
        />
      </div>

      {empty ? (
        // Named, never a blank table. A malformed language string makes the SDK
        // return zero elements without raising, so "nothing here" has to be an
        // explicit state or it reads as a broken studio.
        <div className="callout" role="status">
          <span className="callout-label">No text found</span>
          <p>
            OCR completed but found no text in this document. If you selected
            languages, try the ones actually printed on the page.
          </p>
        </div>
      ) : (
        <>
          <div className="panel-row-h panel-row results-actions">
            <Segmented
              options={
                isMarkdown
                  ? [
                      { label: "Markdown", value: "markdown" },
                      { label: "Code", value: "code" },
                      { label: "JSON", value: "raw" },
                    ]
                  : [
                      { label: "Elements", value: "elements" },
                      { label: "Text", value: "text" },
                      { label: "JSON", value: "raw" },
                      { label: "Code", value: "code" },
                    ]
              }
              // Genuinely `view`, not `isMarkdown ? "markdown" : view` — that
              // forced value made the segmented control lie about which pane
              // was showing: clicking JSON switched the pane but the Markdown
              // button stayed aria-pressed="true", because `value` ignored
              // `view` whenever isMarkdown was true. `view` is kept in sync
              // with `isMarkdown` by the effect above, so it is always one of
              // the options currently on offer.
              value={view}
              onChange={setView}
            />
            <div className="results-actions-btns">
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => navigator.clipboard.writeText(payload())}
              >
                Copy
              </button>
              <button type="button" className="btn ghost sm" onClick={download}>
                Download
              </button>
            </div>
          </div>

          {view === "code" ? (
            // First, not folded into the chain below: `isMarkdown && view !==
            // "raw"` is true when view is "code", so leading with that test
            // would render the markdown pane over the Code segment.
            <pre className="ocr-text mono">
              {code ?? "# run OCR to see the code"}
            </pre>
          ) : isMarkdown && view !== "raw" ? (
            <pre className="ocr-text mono">{result.markdown}</pre>
          ) : view === "raw" ? (
            <pre className="ocr-text mono">
              {JSON.stringify(resultJson, null, 2)}
            </pre>
          ) : view === "text" ? (
            <pre className="ocr-text mono">{result.fullText ?? ""}</pre>
          ) : (
            <table className="field-table ocr-elements">
              <tbody>
                {textElements.map((el, index) => (
                  <tr
                    key={`${el.readingOrder}-${el.text.slice(0, 12)}`}
                    data-selected={index === activeIndex}
                    onClick={() => onSelectElement(index)}
                  >
                    <td className="mono muted">{el.readingOrder}</td>
                    <td className="mono muted">{el.type}</td>
                    <td>{el.text}</td>
                    <td className="mono">
                      <span
                        className={`match-dot ${confidenceTone(el.confidence)}`}
                        role="img"
                        aria-label={`confidence ${Math.round(el.confidence * 100)}%`}
                      />
                      {Math.round(el.confidence * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
