"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const ViewerComponent = dynamic(
  () => import("@/app/web-sdk/annotation-permissions/viewer"),
  {
    ssr: false,
    loading: () => (
      <LoadingSpinner message="Loading annotation permissions demo..." />
    ),
  },
);

export default function AnnotationPermissionsPage() {
  return (
    <SampleFrame
      title="Annotation Permissions"
      description="Role-based annotation permissions with a teacher/student classroom model"
    >
      <ViewerComponent />
    </SampleFrame>
  );
}
