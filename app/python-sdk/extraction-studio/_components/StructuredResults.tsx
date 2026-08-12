"use client";
import { useEffect, useRef, useState } from "react";
import type { FieldResult, StructuredData } from "../lib/api";
import { copyText, downloadText } from "../lib/download";
import { providerLabel } from "../lib/provenance";
import { verifiedFor } from "../lib/verified";
import { compareField, summarise } from "../lib/verify";
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

/** The answer key stores raw numbers ("Amount Due $345,015.00" becomes
 *  345015), but showing that back without separators reads as a different,
 *  smaller number than the one on the document. Format the way the source
 *  document prints it; strings pass through unchanged. */
function formatVerifiedValue(value: string | number): string {
  return typeof value === "number" ? value.toLocaleString("en-US") : value;
}

export function StructuredResults({
  docId,
  data,
  code,
  timingMs,
  config,
  activeIndex,
  onSelectField,
  showCitations,
  onShowCitationsChange,
  citationHex,
  onCitationHexChange,
}: {
  /** The document these fields were extracted from — the key into the
   *  verified-answer lookup, so this panel can say whether each field is
   *  actually right rather than merely grounded. */
  docId: string;
  data: StructuredData;
  code?: string;
  timingMs?: number;
  /** The backend's echo of the run. `Record<string, unknown>` because that is
   *  what the Envelope declares — the shape is the backend's to change, and a
   *  narrower type here would be a claim this component cannot enforce. */
  config?: Record<string, unknown>;
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

  // One verdict per field, in field order. compareField owns every rule; this
  // component only renders what it decides. verifiedValues is kept alongside
  // so the "expected ..." text below can show what the key says without a
  // second lookup.
  const verifiedValues = data.fields.map((f) => verifiedFor(docId, f.name));
  const verdicts = data.fields.map((f, i) =>
    compareField(f.value, verifiedValues[i], f.type),
  );
  const score = summarise(verdicts);

  const payload = () =>
    view === "code" ? (code ?? "") : JSON.stringify(data.extraction, null, 2);

  const download = () => {
    const isCode = view === "code";
    downloadText(
      payload(),
      isCode ? "extraction.py" : "extraction.json",
      isCode ? "text/x-python" : "application/json",
    );
  };

  return (
    <div>
      <div className="results-meta">
        {timingMs != null && (
          <span className="mono muted">{(timingMs / 1000).toFixed(1)}s</span>
        )}
        {/* Which model produced these fields. This panel is the one where the
            omission bit hardest: the studio offers four providers and a model
            list per provider, so "the extraction got it wrong" is unanswerable
            without knowing which model ran — and the demo trap on the flagship
            invoice (the retainage figure) is model-specific. */}
        {providerLabel(config?.provider as string | undefined) && (
          <span className="mono muted">
            {providerLabel(config?.provider as string | undefined)}
            {typeof config?.model === "string" ? ` · ${config.model}` : ""}
          </span>
        )}
        <Toggle
          checked={showCitations}
          onChange={onShowCitationsChange}
          label="Show citations"
        />
        {score.verified > 0 && (
          <span className="muted">
            {score.matched} of {score.verified} verified fields match
          </span>
        )}
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
            <span>Verified</span>
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
              {/* Words, not a dot: the Parse column's dot means the SDK LOCATED
                  the value (grounding), and this means the value is RIGHT. On
                  the retainage case the pair is grounded true / correct
                  false, so two similar-looking marks would actively
                  mislead. */}
              <span className={`field-row-verified ${verdicts[i]}`}>
                {verdicts[i] === "match"
                  ? "✓"
                  : verdicts[i] === "mismatch"
                    ? `✗ expected ${formatVerifiedValue(verifiedValues[i]?.value ?? "")}`
                    : "— not verified"}
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
