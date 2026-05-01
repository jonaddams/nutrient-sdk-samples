"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document assembly..." />,
});

export default function DocumentAssemblyPage() {
  return (
    <SampleFrame
      title="Document Assembly"
      description="Assemble documents by dragging pages between two viewers. All page manipulation is performed client-side in the browser using the Nutrient Web SDK."
      wide
    >
      <Viewer />
    </SampleFrame>
  );
}
