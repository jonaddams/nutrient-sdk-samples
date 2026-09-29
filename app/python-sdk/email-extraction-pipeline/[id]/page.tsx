"use client";

import { use, useMemo } from "react";
import { DetailWorkspace } from "../_components/DetailWorkspace";
import { filterFromParams } from "../_lib/list-filter";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = use(params);
  const sp = use(searchParams);
  const status = typeof sp.status === "string" ? sp.status : "";
  const q = typeof sp.q === "string" ? sp.q : "";
  // The list filter the reader arrived with, so prev/next pages through the
  // rows they were looking at. Memoised on its values: a fresh object every
  // render would refetch the neighbours every render.
  const filter = useMemo(
    () => filterFromParams(new URLSearchParams({ status, q })),
    [status, q],
  );
  return (
    <div className="min-h-screen bg-[var(--bg-elev)]">
      <DetailWorkspace id={id} filter={filter} />
    </div>
  );
}
