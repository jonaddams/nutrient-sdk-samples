"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading Slot UI Customization..." />,
});

export default function QAChecklistSidebarPage() {
  return (
    <SampleFrame
      title="Slot UI Customization"
      description="Custom sidebar, comment badges, and interactive slot actions — demonstrating the Nutrient Web SDK slot UI customization API"
    >
      <Viewer />
    </SampleFrame>
  );
}
