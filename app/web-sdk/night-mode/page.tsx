"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

export default function NightModePage() {
  return (
    <SampleFrame
      title="Night Mode"
      description="Toggle night mode in the PDF viewer with a custom toolbar button. Uses CSS filter inversion to render documents in a dark-friendly color scheme."
    >
      <Viewer />
    </SampleFrame>
  );
}
