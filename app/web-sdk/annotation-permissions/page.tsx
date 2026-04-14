"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

const ViewerComponent = dynamic(
  () => import("@/app/web-sdk/annotation-permissions/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading annotation permissions demo..." />,
  },
);

export default function AnnotationPermissionsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414] flex flex-col">
      <SampleHeader
        title="Annotation Permissions"
        description="Role-based annotation permissions with a teacher/student classroom model"
      />

      <div className="flex flex-1 overflow-hidden justify-center px-6 pt-6 pb-8">
        <div className="flex-1 overflow-hidden max-w-7xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 flex flex-col">
          <ViewerComponent />
        </div>
      </div>
    </div>
  );
}
