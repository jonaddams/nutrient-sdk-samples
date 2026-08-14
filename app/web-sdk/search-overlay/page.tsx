"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const SearchOverlayViewer = dynamic(
  () => import("@/app/web-sdk/search-overlay/viewer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner message="Loading search viewer..." />,
  },
);

export default function SearchOverlayPage() {
  return (
    <SampleFrame
      title="Search with Overlay Highlights"
      description="Every match highlighted with custom overlay items instead of annotations — the document itself is never modified"
    >
      <SearchOverlayViewer
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
