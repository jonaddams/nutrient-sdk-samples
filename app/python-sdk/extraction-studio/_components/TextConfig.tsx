"use client";
import { useEffect, useRef } from "react";
import type { TextRequest } from "../lib/text";
import { PanelSection } from "./PanelSection";

/**
 * The studio's only config panel with no controls — `export_as_text(filepath)`
 * takes no options at all, and inventing one would be a control that provably
 * does nothing, which is why the Multimodal toggle was deleted and Fast OCR is
 * unbuilt.
 *
 * So the section earns its space by pre-arming the presenter instead: it names
 * what runs and warns that a scan comes back empty, BEFORE they hit that empty
 * state in front of a prospect.
 *
 * Deliberately does NOT accept or call `onProvidersReady`. This feature needs
 * no credentials, and its `panels` entry sets `needsProviders: false`; a child
 * reporting readiness on mount loses the race against the parent's own reset
 * anyway (HandwritingConfig shipped exactly that bug).
 */
export function TextConfig({
  docPath,
  filename,
  onRun,
  runSignal,
}: {
  docPath: string;
  filename: string;
  onRun: (req: TextRequest) => void;
  runSignal: number;
}) {
  // Run lives in the panel head so it is reachable from the Results tab, so the
  // click arrives as an incrementing signal. Skip the initial render: 0 is not
  // a request to run.
  const lastSignal = useRef(runSignal);
  useEffect(() => {
    if (runSignal === lastSignal.current) return;
    lastSignal.current = runSignal;
    onRun({ docPath, filename });
  }, [runSignal, docPath, filename, onRun]);

  return (
    <PanelSection title="Text layer">
      <p className="hint">
        Reads the text the document already carries — one SDK call, no model, no
        API key and no network. It typically finishes in a few milliseconds.
      </p>
      <p className="hint">
        Columns and spacing are kept roughly where they sit on the page, so a
        two-column document reads out of order line by line. A scanned document
        has no text layer at all and comes back empty — that is when Adaptive
        OCR is the right tool.
      </p>
    </PanelSection>
  );
}
