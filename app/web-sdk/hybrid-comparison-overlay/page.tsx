"use client";

import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import { ViewerErrorBoundary } from "@/app/web-sdk/_components/ViewerErrorBoundary";
import { HybridComparisonOverlayViewer } from "./viewer";

export default function Page() {
  return (
    <div>
      <SampleHeader
        title="Hybrid Comparison — Custom Overlay"
        description="Single-view document comparison where each text change is a custom-overlay callout pinned to its location on the page, showing the before → after value."
      />
      <ViewerErrorBoundary>
        <HybridComparisonOverlayViewer />
      </ViewerErrorBoundary>
    </div>
  );
}
