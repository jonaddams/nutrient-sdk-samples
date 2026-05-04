"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

export default function CountingAnnotationsPage() {
  return (
    <SampleFrame
      title="Counting Annotations"
      description="Click anywhere on the document to place numbered markers. Each click adds a custom-rendered annotation with an incrementing count. The sidebar tracks all placed markers with coordinates."
    >
      <Viewer />
    </SampleFrame>
  );
}
