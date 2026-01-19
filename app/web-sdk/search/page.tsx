"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

const SearchViewer = dynamic(() => import("@/app/web-sdk/search/viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading search viewer..." />,
});

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Document Search"
        description="Search through PDF documents with context-aware results and instant navigation"
      />

      {/* Viewer Container */}
      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <SearchViewer
            document="/documents/20000-leagues-under-the-sea.pdf"
            exampleSearchTerms={[
              "Captain Nemo",
              "Aronnax",
              "Nautilus",
              "ocean",
              "submarine",
            ]}
          />
        </div>
      </main>
    </div>
  );
}
