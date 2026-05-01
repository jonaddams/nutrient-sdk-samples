"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

export default function ZoomLevelDisplayPage() {
  return (
    <SampleFrame
      title="Zoom Level Display"
      description="Displays the current zoom level as a percentage in a custom toolbar button. Click the percentage to reset zoom to 100%."
    >
      <Viewer />
    </SampleFrame>
  );
}
