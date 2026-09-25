"use client";

import { use } from "react";
import { DetailWorkspace } from "../_components/DetailWorkspace";
import "../styles.css";

/**
 * One extraction, at its own URL.
 *
 * The review workspace replaces the list rather than expanding below it. That
 * is not only a layout preference: a review is a thing you link someone to,
 * come back to, and page through with the browser's own back button. None of
 * that works when the detail is a boolean on the list page.
 *
 * Deliberately no PythonSampleHeader. It renders a breadcrumb, the sample
 * title and the sample description — all of which the workspace's own header
 * already carries, for THIS extraction rather than the sample. Rendering both
 * gave the page two breadcrumbs and two titles, and cost roughly 320px of
 * height before the document got any. The site topbar comes from the root
 * layout and is unaffected.
 */
export default function ExtractionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <div className="min-h-screen bg-[var(--bg-elev)]">
      <DetailWorkspace id={id} />
    </div>
  );
}
