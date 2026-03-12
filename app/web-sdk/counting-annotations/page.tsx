"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

export default function CountingAnnotationsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Counting Annotations"
        description="Click anywhere on the document to place numbered markers. Each click adds a custom-rendered annotation with an incrementing count. The sidebar tracks all placed markers with coordinates."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-12rem)]">
          <Viewer />
        </div>
      </main>
    </div>
  );
}
