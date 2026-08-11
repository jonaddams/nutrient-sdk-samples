"use client";
import { useEffect, useRef, useState } from "react";
import type { FieldResult, StructuredData } from "../lib/api";
import { HighlightColor } from "./HighlightColor";
import { Segmented } from "./Segmented";
import { Toggle } from "./Toggle";

export function confidencePct(f: FieldResult): string {
  return f.confidence == null ? "—" : `${Math.round(f.confidence * 100)}%`;
}

export function matchTone(match: string | null): string {
  if (match === "exact") return "tag solid";
  if (match === "not_found") return "tag wip";
  return "tag";
}

// The dense row has no room for a `match` pill, so grounding strength is shown
// as a coloured dot instead. `exact` and `id_match` both mean the value was
// found verbatim in the document, which is the claim the citation rests on.
export function matchDotTone(match: string | null): string {
  if (match === "exact" || match === "id_match") return "good";
  if (match === "not_found") return "bad";
  return "partial";
}

export function StructuredResults({
  data,
  code,
  timingMs,
  activeIndex,
  onSelectField,
  showCitations,
  onShowCitationsChange,
  citationHex,
  onCitationHexChange,
}: {
  data: StructuredData;
  code?: string;
  timingMs?: number;
  activeIndex: number | null;
  onSelectField: (i: number) => void;
  showCitations: boolean;
  onShowCitationsChange: (v: boolean) => void;
  citationHex: string;
  onCitationHexChange: (hex: string) => void;
}) {
  const [view, setView] = useState("fields");

  // Selecting a citation in the document is useless if its card sits below the
  // fold, so the list follows the selection regardless of which side set it.
  const cardRefs = useRef(new Map<number, HTMLButtonElement>());
  useEffect(() => {
    if (activeIndex == null) return;
    cardRefs.current.get(activeIndex)?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [activeIndex]);

  const payload = () =>
    view === "code" ? (code ?? "") : JSON.stringify(data.extraction, null, 2);

  const download = () => {
    const isCode = view === "code";
    const blob = new Blob([payload()], {
      type: isCode ? "text/x-python" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = isCode ? "extraction.py" : "extraction.json";
    a.click();
    // Deferred: revoking synchronously races the browser's internal blob
    // fetch for the download in some browsers (notably older Safari).
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div>
      <div className="results-meta">
        {timingMs != null && (
          <span className="mono muted">{(timingMs / 1000).toFixed(1)}s</span>
        )}
        <Toggle
          checked={showCitations}
          onChange={onShowCitationsChange}
          label="Show citations"
        />
      </div>

      {/* Colour lives next to the visibility toggle: same concern, and it is
          only meaningful once there are citations on the page. */}
      {showCitations && (
        <HighlightColor
          label="Citation color"
          value={citationHex}
          onChange={onCitationHexChange}
        />
      )}

      <div className="panel-row-h panel-row results-actions">
        <Segmented
          label="View"
          options={[
            { label: "Fields", value: "fields" },
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
        <pre className="mono">
          {/* Same wording as OcrResults: the placeholder only ever shows after
              a run (the panel does not render otherwise), so an instruction to
              run again would describe the reader's own last action. */}
          {code ?? "# code snippet unavailable from this backend"}
        </pre>
      ) : view === "raw" ? (
        <pre className="mono">{JSON.stringify(data.extraction, null, 2)}</pre>
      ) : (
        <div className="field-table">
          {/* Shares .field-row's grid so the labels land over their columns.
					    aria-hidden because it is a visual key, not a real table header:
					    the rows are buttons, and each cell already carries its own
					    accessible text. */}
          <div className="field-table-head eyebrow" aria-hidden="true">
            <span>Field</span>
            <span>Value</span>
            <span>Page</span>
            <span>Parse</span>
          </div>
          {data.fields.map((f, i) => (
            <button
              key={f.name}
              type="button"
              className={`field-row${activeIndex === i ? " active" : ""}`}
              onClick={() => onSelectField(i)}
              aria-pressed={activeIndex === i}
              ref={(el) => {
                if (el) cardRefs.current.set(i, el);
                else cardRefs.current.delete(i);
              }}
            >
              {/* The declared type lives in the tooltip: on a one-line row it
							    would crowd out the value, and it is already shown in the
							    schema builder and the JSON tab. */}
              <span className="field-row-name" title={`${f.name} · ${f.type}`}>
                {f.name}
              </span>
              <span className="field-row-value">
                {f.value == null ? "—" : String(f.value)}
              </span>
              <span className="field-row-page">
                {f.page != null ? `p${f.page + 1}` : "—"}
              </span>
              <span className="field-row-parse">
                {confidencePct(f)}
                {f.match && (
                  <span
                    className={`match-dot ${matchDotTone(f.match)}`}
                    role="img"
                    aria-label={`match: ${f.match}`}
                    title={f.match}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
