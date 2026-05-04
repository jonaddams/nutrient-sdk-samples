"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(
  () => import("@/app/web-sdk/custom-ui-form-creator/viewer"),
  {
    ssr: false,
    loading: () => (
      <LoadingSpinner message="Loading custom UI form creator..." />
    ),
  },
);

export default function CustomUIFormCreatorPage() {
  return (
    <SampleFrame
      title="Custom UI Form Creator"
      description="Build custom form builder UI by hiding SDK defaults and replacing with your own components"
    >
      <Viewer />
    </SampleFrame>
  );
}
