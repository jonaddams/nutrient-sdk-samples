"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

const AnnotationStateViewer = dynamic(
  () => import("@/app/web-sdk/annotation-state/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading annotation state..." />,
  },
);

export default function AnnotationStatePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414] flex flex-col">
      <SampleHeader
        title="Annotation State Management"
        description="Save and restore annotation states locally with version control-like functionality"
      />

      <div className="flex flex-1 overflow-hidden">
        <AnnotationStateViewer />
      </div>
    </div>
  );
}
