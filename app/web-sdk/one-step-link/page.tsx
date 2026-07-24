"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

export default function OneStepLinkPage() {
  return (
    <SampleFrame
      title="One-Step Link"
      description="Add a visible, clickable link in a single guided action. The Add Link button prompts for text, color, and URL, then a single click on the page creates both the text label and the link annotation together."
    >
      <Viewer />
    </SampleFrame>
  );
}
