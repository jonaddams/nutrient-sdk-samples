"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

export default function ConstructionMeasurementPage() {
  return (
    <SampleFrame
      title="Construction Measurement"
      description="Measure distances on a construction floor plan by dropping two pins. The measurement line and its live distance label update as you drag either pin."
    >
      <Viewer />
    </SampleFrame>
  );
}
