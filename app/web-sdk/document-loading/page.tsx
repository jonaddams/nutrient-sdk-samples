"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

const DocumentLoadingViewer = dynamic(
  () => import("@/app/web-sdk/document-loading/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading document viewer..." />,
  },
);

export default function DocumentLoadingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Document Loading Methods"
        description="Explore all supported methods for loading PDFs: URL, ArrayBuffer, Blob, and Base64"
      />

      {/* Viewer Container */}
      <main className="max-w-7xl mx-auto px-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <DocumentLoadingViewer />
        </div>
      </main>
    </div>
  );
}
