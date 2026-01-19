"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleHeader } from "@/app/web-sdk/_components/SampleHeader";

const FormDesignerViewer = dynamic(
  () => import("@/app/web-sdk/form-designer/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading form designer..." />,
  },
);

export default function FormDesignerPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1414] flex flex-col">
      <SampleHeader
        title="Form Designer"
        description="Drag and drop form fields onto PDF documents with an intuitive form creator mode"
      />

      <div className="flex flex-1 overflow-hidden justify-center px-6 pt-6 pb-8">
        <main className="flex-1 overflow-hidden max-w-7xl bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <FormDesignerViewer />
        </main>
      </div>
    </div>
  );
}
