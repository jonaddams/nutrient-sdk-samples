"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const FormDesignerViewer = dynamic(
  () => import("@/app/web-sdk/form-designer/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading form designer..." />,
  },
);

export default function FormDesignerPage() {
  return (
    <SampleFrame
      title="Form Designer"
      description="Drag and drop form fields onto PDF documents with an intuitive form creator mode"
    >
      <FormDesignerViewer />
    </SampleFrame>
  );
}
