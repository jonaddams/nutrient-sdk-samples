"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const DocumentLoadingViewer = dynamic(
  () => import("@/app/web-sdk/document-loading/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading document viewer..." />,
  },
);

export default function DocumentLoadingPage() {
  return (
    <SampleFrame
      title="Document Loading Methods"
      description="Explore all supported methods for loading PDFs: URL, ArrayBuffer, Blob, and Base64"
    >
      <DocumentLoadingViewer />
    </SampleFrame>
  );
}
