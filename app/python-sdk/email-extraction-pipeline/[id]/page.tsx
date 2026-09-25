"use client";

import { use } from "react";
import { PythonSampleHeader } from "../../_components/PythonSampleHeader";
import { DetailWorkspace } from "../_components/DetailWorkspace";
import "../styles.css";

/**
 * One extraction, at its own URL.
 *
 * The review workspace replaces the list rather than expanding below it. That
 * is not only a layout preference: a review is a thing you link someone to,
 * come back to, and page through with the browser's own back button. None of
 * that works when the detail is a boolean on the list page.
 */
export default function ExtractionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="min-h-screen bg-[var(--bg-elev)]">
      <PythonSampleHeader
        title="Email Extraction Pipeline"
        description="Inbound email becomes a validated, structured row with a bounding box for every extracted field."
      />
      <DetailWorkspace id={id} />
    </div>
  );
}
