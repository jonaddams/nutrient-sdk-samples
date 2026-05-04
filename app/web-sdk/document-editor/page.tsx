"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document editor..." />,
});

export default function DocumentEditorPage() {
  return (
    <SampleFrame
      title="Document Editor"
      description="Manipulate PDF pages with drag-and-drop, delete, rotate, and copy operations. Queue operations for review before applying them to your documents."
    >
      <Viewer />
    </SampleFrame>
  );
}
