"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

const NumberedCalloutsViewer = dynamic(
  () => import("@/app/web-sdk/numbered-callouts/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading numbered callouts..." />,
  },
);

export default function NumberedCalloutsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414] flex flex-col">
      <SampleHeader
        title="Numbered Callouts"
        description="Bluebeam/Procore-style numbered bubble + leader arrows for construction punch lists, with a live legend sidebar"
      />

      <div className="flex flex-1 overflow-hidden justify-center px-6 pt-6 pb-8">
        <main className="flex-1 overflow-hidden max-w-7xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <NumberedCalloutsViewer />
        </main>
      </div>
    </div>
  );
}
