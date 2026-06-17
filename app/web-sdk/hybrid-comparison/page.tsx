"use client";

import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import { ViewerErrorBoundary } from "@/app/web-sdk/_components/ViewerErrorBoundary";
import { HybridComparisonViewer } from "./viewer";

export default function Page() {
  return (
    <div>
      <SampleHeader
        title="Hybrid Comparison"
        description="Compare a document pair visually (overlay) and textually at once, with auto-highlighted changes and reviewer markup on both views."
      />
      <ViewerErrorBoundary>
        <HybridComparisonViewer />
      </ViewerErrorBoundary>
    </div>
  );
}
