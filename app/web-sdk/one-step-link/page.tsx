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
      intro={
        <div className="callout">
          <span className="callout-label">How this works</span>
          <p>
            A PDF <code>LinkAnnotation</code> is only an invisible clickable
            hotspot — it renders no text of its own. Showing visible, clickable
            link text normally takes two steps: create a text annotation, then
            draw a link over it. This sample fuses both into one action: the{" "}
            <strong>Add Link</strong> button collects the text, color, and URL,
            and a single <code>instance.create([...])</code> call adds a{" "}
            <code>TextAnnotation</code> (the visible label) and a{" "}
            <code>LinkAnnotation</code> (a <code>URIAction</code>) sharing one
            bounding box.
          </p>
        </div>
      }
    >
      <Viewer />
    </SampleFrame>
  );
}
