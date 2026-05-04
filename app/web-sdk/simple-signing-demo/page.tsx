"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading signing demo..." />,
});

export default function SimpleSigningDemoPage() {
  return (
    <SampleFrame
      title="Simple Signing Demo"
      description="Demonstrates digital signing workflow with the Nutrient Web SDK and DWS API."
    >
      <Viewer />
    </SampleFrame>
  );
}
