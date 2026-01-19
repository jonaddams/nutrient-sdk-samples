"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";
import "@/nutrient-brand-resources/styles/nutrient-brand.css";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document editor..." />,
});

export default function DocumentEditorPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414] flex flex-col">
      <SampleHeader
        title="Document Editor"
        description="Manipulate PDF pages with drag-and-drop, delete, rotate, and copy operations. Queue operations for review before applying them to your documents."
      />

      <div className="flex flex-1 overflow-hidden justify-center px-6 pt-6 pb-8">
        <div className="flex-1 max-w-7xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Viewer />
        </div>
      </div>
    </div>
  );
}
