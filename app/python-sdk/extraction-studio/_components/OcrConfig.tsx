"use client";
import { useEffect, useRef, useState } from "react";
import { OCR_LANGUAGES, type OcrRequest } from "../lib/ocr";
import { Field } from "./Field";
import { PanelSection } from "./PanelSection";
import { Segmented } from "./Segmented";
import { Toggle } from "./Toggle";

/**
 * Adaptive OCR options.
 *
 * THREE controls, because only three of the SDK's OCR settings measurably
 * change the output. favor_accuracy, enable_preprocessing,
 * enable_skew_detection and WordsDetectionSettings.confidence_threshold were
 * byte-identical across both values on two documents (2026-08-06) and get no
 * control — a control a prospect can flip that provably does nothing is the
 * Multimodal toggle that was deleted the same day.
 *
 * No provider select and no readiness gating: OCR runs locally with no
 * credentials, so none of StructuredConfig's fetchProviders machinery applies.
 */
export function OcrConfig({
  docPath,
  filename,
  onRun,
  runSignal,
}: {
  docPath: string;
  filename: string;
  onRun: (req: OcrRequest) => void;
  runSignal: number;
}) {
  const [languages, setLanguages] = useState<string[]>(["eng"]);
  const [tableDetection, setTableDetection] = useState(true);
  const [outputFormat, setOutputFormat] = useState("json");

  // Same signal pattern as StructuredConfig: Run lives in the panel head so it
  // is reachable from the Results tab, so the click arrives as an incrementing
  // number. Skip the initial render — a mount is not a request to run.
  const lastSignal = useRef(runSignal);
  useEffect(() => {
    if (runSignal === lastSignal.current) return;
    lastSignal.current = runSignal;
    onRun({
      docPath,
      filename,
      languages,
      tableDetection,
      outputFormat: outputFormat === "markdown" ? "markdown" : "json",
    });
  }, [runSignal, docPath, filename, languages, tableDetection, outputFormat, onRun]);

  const toggleLanguage = (code: string) =>
    setLanguages((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );

  return (
    <div>
      <PanelSection title="Recognition">
        <Field
          label="Languages"
          help="Pick the languages actually on the page — naming them correctly raises the confidence scores. Codes are joined with a plus sign, which is the only separator the SDK accepts."
        >
          {/* Chips rather than <select multiple>, which is poor on touch and in
              a narrow panel. aria-pressed carries the state, matching how
              CitationColor's preset swatches already work.
              role="group" + aria-label repeats what Field's <label> already
              says visually, because that <label> has no htmlFor target here
              (there is no single input for a chip row to point at) and so is
              not programmatically associated with anything — without this, a
              screen reader announces each chip only as "eng, button,
              pressed", with no indication of what is being chosen. */}
          <div className="lang-chips" role="group" aria-label="Languages">
            {OCR_LANGUAGES.map((code) => (
              <button
                key={code}
                type="button"
                className="lang-chip"
                aria-pressed={languages.includes(code)}
                onClick={() => toggleLanguage(code)}
              >
                {code}
              </button>
            ))}
          </div>
        </Field>
      </PanelSection>

      <PanelSection title="Output">
        {/* No htmlFor: Segmented takes no id prop and renders no element with
            one, so pointing Field's <label for> at "ocr-format" would be a
            dangling reference — Segmented is shared with StructuredConfig and
            StructuredResults, so it does not get an id prop added just for
            this one caller's label. The outer role="group" below (not
            Segmented's own — that one carries no name) gives the pair of
            option buttons an accessible name without touching Segmented. */}
        <Field label="Format" help="Structured elements with positions and confidence, or a Markdown rendering of the page.">
          <div role="group" aria-label="Format">
            <Segmented
              options={[
                { label: "Elements", value: "json" },
                { label: "Markdown", value: "markdown" },
              ]}
              value={outputFormat}
              onChange={setOutputFormat}
            />
          </div>
        </Field>
        <Toggle
          checked={tableDetection}
          onChange={setTableDetection}
          label="Detect tables"
          description="Recognise tables as structured elements. Turning it off returned fewer elements and slightly lower confidence on a table-bearing invoice."
        />
      </PanelSection>
    </div>
  );
}
