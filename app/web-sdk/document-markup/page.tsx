"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const DocumentMarkupViewer = dynamic(
  () => import("@/app/web-sdk/document-markup/viewer"),
  {
    ssr: false,
    loading: () => (
      <LoadingSpinner message="Loading document markup viewer..." />
    ),
  },
);

export default function DocumentMarkupPage() {
  return (
    <SampleFrame
      title="Document Markup Modes"
      description="View and toggle between different markup modes for Word documents with tracked changes and comments"
    >
      <DocumentMarkupViewer document="/documents/sample-with-changes-comments.docx" />
    </SampleFrame>
  );
}
