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

      <div className="flex flex-1 overflow-hidden justify-center px-6 pt-6 pb-8">
        <div className="flex-1 overflow-hidden max-w-7xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <AnnotationStateViewer />
        </div>
      </div>
    </div>
  );
}
