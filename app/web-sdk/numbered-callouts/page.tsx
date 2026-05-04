"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const NumberedCalloutsViewer = dynamic(
  () => import("@/app/web-sdk/numbered-callouts/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading numbered callouts..." />,
  },
);

export default function NumberedCalloutsPage() {
  return (
    <SampleFrame
      title="Numbered Callouts"
      description="Bluebeam/Procore-style numbered bubble + leader arrows for construction punch lists, with a live legend sidebar"
    >
      <NumberedCalloutsViewer />
    </SampleFrame>
  );
}
