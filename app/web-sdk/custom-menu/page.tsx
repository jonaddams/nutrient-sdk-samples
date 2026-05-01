"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading viewer..." />,
});

export default function CustomMenuPage() {
  return (
    <SampleFrame
      title="Custom Menu Interface"
      description="A completely custom menu interface for the Nutrient Web SDK viewer with custom toolbar, annotation tools, document comparison, and measurement capabilities."
    >
      <Viewer />
    </SampleFrame>
  );
}
