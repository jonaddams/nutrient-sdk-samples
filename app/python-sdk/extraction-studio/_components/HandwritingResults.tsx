"use client";
import { useState } from "react";
import { copyText, downloadText } from "../lib/download";
import { type HandwritingResult, isVlmRun } from "../lib/handwriting";
import { confidenceTone, type OcrColorMode } from "../lib/ocr";
import { engineLabel, providerLabel } from "../lib/provenance";
import { HighlightColor } from "./HighlightColor";
import { Segmented } from "./Segmented";
import { Toggle } from "./Toggle";

// Shared between the visible eyebrow and the `label` passed to HighlightColor,
// which also feeds both of that component's aria-labels via toLowerCase().
const REGION_COLOR = "Region color";

/** Results for handwriting recognition.
 *
 *  Its own component rather than a mode on OcrResults, which is 295 lines
 *  already threading markdown-ness through its meta row, its view segments and
 *  its download filenames. What differs here is not a filename: two of the
 *  panel's figures are absent in one of the two engines.
 *
 *  Everything mode-dependent keys on the RESULT's engine, never on the config
 *  panel's current toggle — flipping the toggle without re-running must not
 *  change how the run already on screen is described. */
export function HandwritingResults({
  result,
  activeIndex,
  onSelectElement,
  showRegions,
  onShowRegionsChange,
  colorMode,
  onColorModeChange,
  citationHex,
  onCitationHexChange,
}: {
  result: HandwritingResult;
  activeIndex: number | null;
  onSelectElement: (index: number) => void;
  showRegions: boolean;
  onShowRegionsChange: (value: boolean) => void;
  colorMode: OcrColorMode;
  onColorModeChange: (mode: OcrColorMode) => void;
  citationHex: string;
  onCitationHexChange: (hex: string) => void;
}) {
  const isVlm = isVlmRun(result);
  const [view, setView] = useState("elements");
  const textElements = result.textElements ?? [];
  const empty = textElements.length === 0;
  // The JSON view deliberately drops `code`: the snippet has its own segment.
  const { code, ...resultJson } = result;

  // Keyed to the view, so what the button hands over is what is on screen.
  const payload = () => {
    if (view === "code") return code ?? "";
    if (view === "text") return result.fullText ?? "";
    return JSON.stringify(resultJson, null, 2);
  };

  const FILE_FOR_VIEW: Record<string, { type: string; name: string }> = {
    code: { type: "text/x-python", name: "handwriting.py" },
    text: { type: "text/plain", name: "handwriting.txt" },
  };

  const download = () => {
    const { type, name } = FILE_FOR_VIEW[view] ?? {
      type: "application/json",
      name: "handwriting.json",
    };
    downloadText(payload(), name, type);
  };

  return (
    <div>
      <div className="results-meta results-meta-grid">
        <span className="mono muted">
          Elapsed time: {(result.timingMs / 1000).toFixed(1)}s
        </span>
        <span className="mono muted">
          {result.statistics?.textElements ?? 0} elements
        </span>
        {/* Which engine ran, read off the RESULT. `Run extraction` lives in the
            panel head, so it is reachable from this tab with the engine toggle
            hidden — and for this feature the answer is the demo's central
            claim, not a detail: Local ICR means nothing left the machine. */}
        <span className="mono muted">
          {engineLabel(result.config?.engine)}
          {isVlm && providerLabel(result.config?.provider)
            ? ` · ${providerLabel(result.config?.provider)}`
            : ""}
        </span>
        {/* The VLM engine returns the LOCAL pass's confidence scores unchanged
            while rewriting the text — measured byte-identical across both
            engines on the same document. Showing "86% avg confidence" beside a
            transcription the model corrected states something about a run the
            reader cannot see. Elapsed time and the element count are true in
            both modes and stay. Same gating reason as #62's markdown row. */}
        {!isVlm && (
          <span className="mono muted">
            {Math.round((result.statistics?.averageConfidence ?? 0) * 100)}% avg
            confidence
          </span>
        )}
        <Toggle
          checked={showRegions}
          onChange={onShowRegionsChange}
          label="Show regions"
        />
      </div>

      {isVlm && (
        <p className="muted hint-em">
          Confidence scores come from the local recognition pass, not the
          model's corrections, so this panel leaves them out. The raw response
          still carries them — see the JSON view.
        </p>
      )}

      {showRegions && (
        <div className="citation-color">
          <span className="eyebrow">{REGION_COLOR}</span>
          {/* By confidence is offered only for a local run, for the same reason
              the figure above is: it would tint the model's corrections by how
              badly the local pass misread them. handwritingCitationsFor forces
              custom for a VLM run regardless of what this control says, so
              rendering it here would be a control that provably does nothing. */}
          {!isVlm && (
            <Segmented
              label={REGION_COLOR}
              options={[
                { label: "By confidence", value: "confidence" },
                { label: "Custom", value: "custom" },
              ]}
              value={colorMode}
              onChange={(v) => onColorModeChange(v as OcrColorMode)}
            />
          )}
          {/* `embedded` because this sits inside a .citation-color div and
              HighlightColor renders its own — that rule's padding matches at
              ANY depth, so without this the block has double the spacing.
              jsdom computes no layout, so no unit test can see it. */}
          <HighlightColor
            label={REGION_COLOR}
            embedded
            value={citationHex}
            onChange={(hex) => {
              onCitationHexChange(hex);
              onColorModeChange("custom");
            }}
          />
        </div>
      )}

      {/* Outside the empty branch on purpose, matching TablesResults and
          DescribeResults. This panel is otherwise modelled on OcrResults,
          which keeps its actions row INSIDE the non-empty branch — so a run
          that finds nothing offers neither the Code view nor the raw
          response. That is precisely the moment they are wanted: a faint or
          heavily-cursive page comes back with zero elements mid-demo, and the
          two things a solutions engineer reaches for are the Python call that
          ran and what the backend actually returned. Only the element table
          is genuinely empty, so only the element table is replaced. */}
      <div className="panel-row-h panel-row results-actions">
        <Segmented
          label="View"
          options={[
            { label: "Elements", value: "elements" },
            { label: "Text", value: "text" },
            { label: "JSON", value: "raw" },
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
        <pre className="ocr-text mono">
          {/* `code` is optional so this can merge before the backend
              deploys, and in that window the reader has JUST run. Telling
              them to run again reads as a broken control. */}
          {code ?? "# code snippet unavailable from this backend"}
        </pre>
      ) : view === "raw" ? (
        <pre className="ocr-text mono">
          {JSON.stringify(resultJson, null, 2)}
        </pre>
      ) : view === "text" ? (
        <pre className="ocr-text mono">{result.fullText ?? ""}</pre>
      ) : empty ? (
        // Named, never a blank table.
        <div className="callout" role="status">
          <span className="callout-label">No text found</span>
          <p>
            Recognition completed but found no text in this document. If the
            page is faint or heavily slanted, try VLM-enhanced.
          </p>
        </div>
      ) : (
        <table className="field-table ocr-elements">
          <tbody>
            {textElements.map((el, index) => (
              <tr
                key={`${el.readingOrder}-${el.text.slice(0, 12)}`}
                data-selected={index === activeIndex}
                onClick={() => onSelectElement(index)}
              >
                <td className="mono muted">
                  {/* A real <button>, not tabIndex+onKeyDown on the <tr>:
                          keyboard-activatable for free, and a <button> cannot
                          legally wrap sibling <td>s so it lives in the first
                          cell. stopPropagation only prevents the row handler
                          firing twice for a click on the button itself. */}
                  <button
                    type="button"
                    className="row-select"
                    aria-label={`Select element ${el.readingOrder}: ${el.text.slice(0, 40)}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectElement(index);
                    }}
                  >
                    {el.readingOrder}
                  </button>
                </td>
                <td className="mono muted">{el.type}</td>
                <td>{el.text}</td>
                {/* Omitted for a VLM run for the same reason as the meta
                        figure: these are the local pass's scores against text
                        the model rewrote. */}
                {!isVlm && (
                  <td className="mono">
                    <span
                      className={`match-dot ${confidenceTone(el.confidence)}`}
                      role="img"
                      aria-label={`confidence ${Math.round(el.confidence * 100)}%`}
                    />
                    {Math.round(el.confidence * 100)}%
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
