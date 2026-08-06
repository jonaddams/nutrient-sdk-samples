"use client";
import { useState } from "react";
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
 *  fight the confidence tint. */
export function confidenceHex(n: number): string {
  const tone = confidenceTone(n);
  if (tone === "good") return "#22c55e";
  if (tone === "partial") return "#eab308";
  return "#ef4444";
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
  const [view, setView] = useState("elements");
  const isMarkdown = result.config.outputFormat === "markdown";
  const empty = result.textElements.length === 0 && !result.markdown;

  return (
    <div>
      <div className="results-meta">
        <span className="mono muted">{(result.timingMs / 1000).toFixed(1)}s</span>
        <span className="mono muted">
          {result.statistics.textElements} elements
        </span>
        <span className="mono muted">
          {Math.round(result.statistics.averageConfidence * 100)}% avg confidence
        </span>
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
          <Segmented
            options={
              isMarkdown
                ? [
                    { label: "Markdown", value: "markdown" },
                    { label: "JSON", value: "raw" },
                  ]
                : [
                    { label: "Elements", value: "elements" },
                    { label: "Text", value: "text" },
                    { label: "JSON", value: "raw" },
                  ]
            }
            value={isMarkdown ? "markdown" : view}
            onChange={setView}
          />

          {isMarkdown && view !== "raw" ? (
            <pre className="ocr-text mono">{result.markdown}</pre>
          ) : view === "raw" ? (
            <pre className="ocr-text mono">{JSON.stringify(result, null, 2)}</pre>
          ) : view === "text" ? (
            <pre className="ocr-text mono">{result.fullText}</pre>
          ) : (
            <table className="field-table ocr-elements">
              <tbody>
                {result.textElements.map((el, index) => (
                  <tr
                    key={`${el.readingOrder}-${el.text.slice(0, 12)}`}
                    aria-selected={index === activeIndex}
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
