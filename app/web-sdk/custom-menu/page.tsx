"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import "@/nutrient-brand-resources/styles/nutrient-brand.css";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading viewer..." />,
});

export default function CustomMenuPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414]">
      <SampleHeader
        title="Custom Menu Interface"
        description="A completely custom menu interface for the Nutrient Web SDK viewer with custom toolbar, annotation tools, document comparison, and measurement capabilities."
      />

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-8">
        <div className="h-[calc(100vh-12rem)] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Viewer />
        </div>
      </main>
    </div>
  );
}
