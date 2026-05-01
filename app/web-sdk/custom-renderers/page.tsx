"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const CustomRenderersViewer = dynamic(
  () => import("@/app/web-sdk/custom-renderers/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading custom renderers..." />,
  },
);

export default function CustomRenderersPage() {
  return (
    <SampleFrame
      title="Custom Renderers"
      description="Creative custom annotation renderers showcasing visual effects, animations, interactive widgets, and more"
    >
      <CustomRenderersViewer />
    </SampleFrame>
  );
}
