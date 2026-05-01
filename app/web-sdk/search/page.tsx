"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const SearchViewer = dynamic(() => import("@/app/web-sdk/search/viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading search viewer..." />,
});

export default function SearchPage() {
  return (
    <SampleFrame
      title="Document Search"
      description="Search through PDF documents with context-aware results and instant navigation"
    >
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
    </SampleFrame>
  );
}
