"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const AnnotationStateViewer = dynamic(
  () => import("@/app/web-sdk/annotation-state/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading annotation state..." />,
  },
);

export default function AnnotationStatePage() {
  return (
    <SampleFrame
      title="Annotation State Management"
      description="Save and restore annotation states locally with version control-like functionality"
    >
      <AnnotationStateViewer />
    </SampleFrame>
  );
}
