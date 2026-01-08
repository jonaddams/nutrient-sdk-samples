"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

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
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Document Markup Modes"
        description="View and toggle between different markup modes for Word documents with tracked changes and comments"
      />

      {/* Viewer Container */}
      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="h-[calc(100vh-15rem)]">
          <DocumentMarkupViewer document="/documents/sample-with-changes-comments.docx" />
        </div>
      </main>
    </div>
  );
}
