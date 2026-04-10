"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

const CustomRenderersViewer = dynamic(
  () => import("@/app/web-sdk/custom-renderers/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading custom renderers..." />,
  },
);

export default function CustomRenderersPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414] flex flex-col">
      <SampleHeader
        title="Custom Renderers"
        description="Creative custom annotation renderers showcasing visual effects, animations, interactive widgets, and more"
      />

      <div className="flex flex-1 overflow-hidden justify-center px-6 pt-6 pb-8">
        <main className="flex-1 overflow-hidden max-w-7xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <CustomRenderersViewer />
        </main>
      </div>
    </div>
  );
}
