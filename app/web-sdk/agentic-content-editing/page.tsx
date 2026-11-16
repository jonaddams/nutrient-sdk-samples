"use client";

import dynamic from "next/dynamic";
import { LoadingSpinner } from "@/app/web-sdk/_components/LoadingSpinner";
import { SampleFrame } from "@/app/web-sdk/_components/SampleFrame";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
  loading: () => <LoadingSpinner message="Loading document viewer..." />,
});

export default function AgenticContentEditingPage() {
  return (
    <SampleFrame
      title="Agentic Content Editing"
      description="Edit a PDF's real text by asking for it. An AI agent reads the page's text blocks, then rewrites, restyles, adds, and removes them in the live content editor, and the user approves the result with Save or Discard."
      intro={
        <div className="callout">
          <span className="callout-label">How this works</span>
          <p>
            The server hands the model a set of document tools but runs none of
            them. Each tool call streams to the browser, which validates it and
            executes it against <code>instance.contentEditor</code>, the
            headless content-editor API in Web SDK 1.25. That is the same split
            as Document Authoring AI. The difference is the medium: a PDF does
            not reflow, so a longer paragraph can overlap the one below. Every
            edit reports any new overlap, and the agent tightens wording or font
            size to clear it.
          </p>
        </div>
      }
    >
      <Viewer />
    </SampleFrame>
  );
}
