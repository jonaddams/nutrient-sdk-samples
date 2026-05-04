"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

export default function BrightnessContrastPage() {
  return (
    <SampleFrame
      title="Brightness & Contrast"
      description="Bidirectional slider: slide right for night mode (dark reading), slide left to brighten dark or poorly-scanned documents. Uses CSS filters for real-time brightness, contrast, and inversion adjustment."
    >
      <Viewer />
    </SampleFrame>
  );
}
